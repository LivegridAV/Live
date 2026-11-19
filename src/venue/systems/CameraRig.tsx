"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { createSample, samplePath } from "../data/path";
import { journey } from "./journey";
import { useVenue, venue } from "./store";
import { GRAND, grandWorld } from "../data/grand";
import { PROJECTION_VIEWS, inProjectionShowcase } from "../data/projection";
import { RENTAL2026_ARCHITECTURE_HEIGHT, RENTAL2026_VIEWS, inRental2026 } from "../data/ledRental2026";
import { isStallDiagnostic, stallSectionX, stallViewTarget, stallWalkRoute } from "../data/stallVisits";
import { baselineCameraForSearch } from "../data/baselineCameras";
import { TECHNICAL_ARCHITECTURE_HEIGHT } from "../data/technical";
import { EXHIBITION_PROGRESS } from "../data/placements";

/** One camera owner for both the native scroll dolly and real stall visits. */
export function CameraRig() {
  const initialCamera=useThree(s=>s.camera);
  const perspective=useRef(initialCamera as THREE.PerspectiveCamera);
  const set=useThree(s=>s.set), size=useThree(s=>s.size), gl=useThree(s=>s.gl);
  const visit=useVenue(s=>s.stallVisit);
  const orthographic=useMemo(()=>new THREE.OrthographicCamera(-15,15,10,-10,.05,140),[]);
  const sample=useMemo(()=>createSample(),[]);
  const smoothPos=useRef(new THREE.Vector3(0,2.35,21));
  const smoothLook=useRef(new THREE.Vector3(0,4.1,-1));
  const tmp=useRef(new THREE.Vector3()), drift=useRef(new THREE.Vector3());
  const started=useRef(false), previousAspect=useRef(0);
  const visitKey=useRef("");
  const route=useRef<{points:THREE.Vector3[]; index:number; done:boolean; returning:boolean}>({points:[],index:0,done:true,returning:false});
  useEffect(()=>{
    const camera=!baselineCameraForSearch(location.search)&&isStallDiagnostic(visit)?orthographic:perspective.current;
    set({camera});
    return()=>{set({camera:perspective.current});};
  },[visit?.view,orthographic,set]);

  useEffect(()=>{
    if(baselineCameraForSearch(location.search)||visit?.view!=="section")return;
    const previous=gl.clippingPlanes;
    const yaw=GRAND.placements[visit.stall].yaw;
    // Installed Three clipping discards the negative half-space. This normal
    // removes the near +local-X half. The Content Studio slice follows its
    // occupied entry axis rather than the unrelated main artwork centre.
    const normal=new THREE.Vector3(-Math.cos(yaw),0,Math.sin(yaw));
    const point=new THREE.Vector3(...grandWorld(visit.stall,[stallSectionX(visit.stall),0,0]));
    gl.clippingPlanes=[new THREE.Plane().setFromNormalAndCoplanarPoint(normal,point)];
    return()=>{gl.clippingPlanes=previous;};
  },[gl,visit?.stall,visit?.view]);

  useFrame((state,dt)=>{
    const delta=Math.min(.1,dt), s=venue(), aspect=size.width/Math.max(1,size.height);
    const baseline=baselineCameraForSearch(location.search);
    if(baseline) {
      // Historical comparison must retain the recorded world-space camera,
      // including the original aspect and quaternion. No reframe, dolly,
      // portrait compensation, pointer drift or cutaway may alter this pose.
      const camera=perspective.current, recorded=baseline.camera;
      if(state.camera!==camera)set({camera});
      if(s.stallVisit)s.setStallVisit(null);
      route.current.done=true;visitKey.current="";
      camera.position.fromArray(recorded.position);
      camera.quaternion.fromArray(recorded.quaternion);
      camera.fov=recorded.fov;camera.aspect=recorded.aspect;
      camera.near=recorded.near;camera.far=recorded.far;
      camera.updateProjectionMatrix();camera.updateMatrixWorld();
      smoothPos.current.copy(camera.position);
      smoothLook.current.copy(camera.getWorldDirection(tmp.current)).multiplyScalar(5).add(camera.position);
      previousAspect.current=0;
      return;
    }
    samplePath(journey.progress,sample);
    // Fit narrow arrival panels along the approach while retaining 1.7 m eye height.
    if(journey.progress<.15)sample.pos.z+=Math.max(0,1.5/aspect-1)*24*(1-THREE.MathUtils.smoothstep(journey.progress,0,.15));
    // Override ramps are wholly enclosed by their active intervals: no jump
    // from a partially blended target at either gate boundary.
    const rentalRange=EXHIBITION_PROGRESS["led-rental"],projectionRange=EXHIBITION_PROGRESS.projection;
    const rentalFrame=THREE.MathUtils.smoothstep(journey.progress,rentalRange.start,rentalRange.hold[0])*(1-THREE.MathUtils.smoothstep(journey.progress,rentalRange.hold[1],rentalRange.end));
    const projectionFrame=THREE.MathUtils.smoothstep(journey.progress,projectionRange.start,projectionRange.hold[0])*(1-THREE.MathUtils.smoothstep(journey.progress,projectionRange.hold[1],projectionRange.end));
    if(inRental2026(journey.progress)&&s.rentalAngle!=="front") {
      const view=RENTAL2026_VIEWS[s.rentalAngle];
      tmp.current.fromArray(view.position);sample.pos.lerp(tmp.current,rentalFrame);
      tmp.current.fromArray(view.look);sample.look.lerp(tmp.current,rentalFrame);
      sample.fov=THREE.MathUtils.lerp(sample.fov,view.fov,rentalFrame);
    }
    if(inProjectionShowcase(journey.progress)&&s.projectionAngle!=="front") {
      const view=PROJECTION_VIEWS[s.projectionAngle];
      tmp.current.fromArray(view.position);sample.pos.lerp(tmp.current,projectionFrame);
      tmp.current.fromArray(view.look);sample.look.lerp(tmp.current,projectionFrame);
      sample.fov=THREE.MathUtils.lerp(sample.fov,view.fov,projectionFrame);
    }
    const active=s.stallVisit;
    if(active) {
      const target=stallViewTarget(active);
      sample.pos.fromArray(target.position);sample.look.fromArray(target.look);sample.fov=target.fov;
      const key=active.stall+":"+active.view;
      if(key!==visitKey.current) {
        const wasInside=/:(interior|exit)$/.test(visitKey.current);
        visitKey.current=key;
        const walking=(active.view==="interior"||active.view==="exit")&&!wasInside;
        const returning=active.view==="return";
        const leaving=wasInside&&["front","left","right","entrance"].includes(active.view);
        let points=walking?stallWalkRoute(active.stall).map(p=>new THREE.Vector3(...p)):(returning||leaving)&&wasInside?stallWalkRoute(active.stall,true).map(p=>new THREE.Vector3(...p)):[];
        if((returning||leaving)&&points.length){
          let nearest=0;
          for(let i=1;i<points.length;i++)if(points[i].distanceToSquared(smoothPos.current)<points[nearest].distanceToSquared(smoothPos.current))nearest=i;
          points=points.slice(nearest);
        }
        route.current={points,index:0,done:points.length===0,returning};
      }
      const walk=route.current;
      if(!walk.done) {
        const waypoint=walk.points[walk.index];
        const distance=smoothPos.current.distanceTo(waypoint);
        // First move is an establishing dolly to the actual entrance. Once
        // there, eye-height movement follows a measured unobstructed route.
        const speed=walk.index===0?Math.max(2.2,distance*.8):1.7;
        if(distance<.05){sample.pos.copy(waypoint);walk.index++;if(walk.index>=walk.points.length)walk.done=true;}
        else sample.pos.copy(smoothPos.current).add(tmp.current.subVectors(waypoint,smoothPos.current).normalize().multiplyScalar(Math.min(distance,speed*delta)));
        if(walk.returning)sample.look.copy(sample.pos).add(tmp.current.subVectors(waypoint,smoothPos.current).normalize().multiplyScalar(5));
      }
      if(walk.done&&walk.returning) {
        useVenue.getState().setStallVisit(null);
        const url=new URL(location.href);url.searchParams.delete("view");history.replaceState(history.state,"",url);
        visitKey.current="";
      }
      if(isStallDiagnostic(active)) {
        const camera=orthographic;
        const plan=active.view==="plan";
        const actualHeight=active.stall==="technical"?TECHNICAL_ARCHITECTURE_HEIGHT
          :active.stall==="led-rental"?RENTAL2026_ARCHITECTURE_HEIGHT:GRAND.master.height;
        const viewHeight=plan?GRAND.master.depth+5:actualHeight+4;
        const halfH=Math.max(viewHeight/2,(plan?GRAND.master.width+5:GRAND.master.depth+5)/(2*aspect));
        camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;
        camera.position.copy(sample.pos);
        camera.up.fromArray(plan?grandWorld(active.stall,[0,0,-1]).map((v,i)=>v-GRAND.placements[active.stall].root[i]) as [number,number,number]:[0,1,0]);
        camera.lookAt(sample.look);camera.updateProjectionMatrix();camera.updateMatrixWorld();
        return;
      }
    } else visitKey.current="";

    const camera=perspective.current;
    camera.up.set(0,1,0);
    const t=state.clock.elapsedTime;
    const idle=active||journey.progress<.285?0:Math.min(1,journey.idle/1.2)*(s.reducedMotion?.2:1);
    drift.current.set(Math.sin(t*.21)*.07*idle,Math.sin(t*.17+1.3)*.04*idle,Math.sin(t*.13+2.1)*.04*idle);
    tmp.current.copy(sample.pos).add(drift.current);
    const par=active||journey.progress<.285||s.isMobile||s.reducedMotion?0:.15;
    tmp.current.x+=journey.pointerX*par;
    tmp.current.y-=journey.pointerY*par*.5;
    const walking=active&&!route.current.done;
    const follow=walking?1:started.current?Math.min(1,delta*5):1;
    started.current=true;
    smoothPos.current.lerp(tmp.current,follow);
    smoothLook.current.lerp(sample.look,Math.min(1,delta*5));
    camera.position.copy(smoothPos.current);camera.lookAt(smoothLook.current);
    // No banking on scroll: rolling the horizon is a common motion-sickness trigger.
    // Keep a credible lens. Portrait views can crop architecture; side and
    // interior controls expose the rest without a 100-degree stretched lens.
    const portrait=Math.max(0,Math.min(1,(1.2-aspect)/.8));
    const technicalExterior=active?.stall==="technical"&&["front","left","right"].includes(active.view);
    const rentalExterior=active?.stall==="led-rental"&&(active.view==="front"||active.view==="left"||active.view==="right");
    const projectionExterior=active?.stall==="projection"&&(active.view==="front"||active.view==="left"||active.view==="right");
    const authoredAspect=rentalExterior?RENTAL2026_VIEWS[active.view as "front"|"left"|"right"].aspect:16/9;
    // Preserve the authored horizontal framing on the wide reference-review
    // viewport as well as ordinary desktop panels. The booth itself stays fixed.
    const fovTarget=technicalExterior||rentalExterior||projectionExterior
        ?THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(sample.fov)/2)*authoredAspect/aspect)),6,82)
      :active?sample.fov:Math.min(66,sample.fov+portrait*5);
    const resized=Math.abs(previousAspect.current-aspect)>.001;previousAspect.current=aspect;
    if(resized||Math.abs(camera.fov-fovTarget)>.01){camera.fov=resized?fovTarget:camera.fov+(fovTarget-camera.fov)*Math.min(1,delta*5);camera.aspect=aspect;camera.updateProjectionMatrix();}
  },-3);
  return null;
}
