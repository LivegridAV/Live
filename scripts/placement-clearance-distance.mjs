/** Euclidean triangle-mesh distance, independent of the package's nested
 * closestPointToGeometry helper. Three.js triangle projections and the
 * clamped segment/segment formula use Float64 arithmetic. BVH boxes prune
 * pairs only when their proven box-distance lower bound exceeds the best. */
import * as T from 'three';
import {tree} from './placement-geometry.mjs';

export function exactMeshDistance(A,B){
  function boxDistanceSquared(a,b){
    let result=0;
    for(const k of ['x','y','z']){
      const d=Math.max(a.min[k]-b.max[k],b.min[k]-a.max[k],0);result+=d*d;
    }
    return result;
  }
  let best=Infinity,pointA,pointB,pairs=0;
  const point=new T.Vector3(),edgeA=new T.Vector3(),edgeB=new T.Vector3();
  function keep(a,b){
    const distanceSquared=a.distanceToSquared(b);
    if(distanceSquared<best){best=distanceSquared;pointA=a.clone();pointB=b.clone();}
  }
  function edges(p1,q1,p2,q2){
    const d1=new T.Vector3().subVectors(q1,p1),d2=new T.Vector3().subVectors(q2,p2),r=new T.Vector3().subVectors(p1,p2);
    const a=d1.dot(d1),e=d2.dot(d2),f=d2.dot(r);let s,t;
    if(a<1e-20&&e<1e-20){keep(p1,p2);return;}
    if(a<1e-20){s=0;t=T.MathUtils.clamp(f/e,0,1);}
    else{
      const c=d1.dot(r);
      if(e<1e-20){t=0;s=T.MathUtils.clamp(-c/a,0,1);}
      else{
        const b=d1.dot(d2),denominator=a*e-b*b;
        s=denominator!==0?T.MathUtils.clamp((b*f-c*e)/denominator,0,1):0;
        t=(b*s+f)/e;
        if(t<0){t=0;s=T.MathUtils.clamp(-c/a,0,1);}
        else if(t>1){t=1;s=T.MathUtils.clamp((b-c)/a,0,1);}
      }
    }
    edgeA.copy(d1).multiplyScalar(s).add(p1);edgeB.copy(d2).multiplyScalar(t).add(p2);keep(edgeA,edgeB);
  }
  function pair(a,b){
    pairs++;
    const av=[a.a,a.b,a.c],bv=[b.a,b.b,b.c];
    for(const p of av){b.closestPointToPoint(p,point);keep(p,point);}
    for(const p of bv){a.closestPointToPoint(p,point);keep(point,p);}
    for(let i=0;i<3;i++)for(let j=0;j<3;j++)edges(av[i],av[(i+1)%3],bv[j],bv[(j+1)%3]);
  }
  const triangle=new T.Triangle(),bounds=new T.Box3(),position=A.g.attributes.position,index=A.g.index,bvh=tree(B);
  for(let i=0;i<index.count;i+=3){
    triangle.a.fromBufferAttribute(position,index.getX(i));triangle.b.fromBufferAttribute(position,index.getX(i+1));triangle.c.fromBufferAttribute(position,index.getX(i+2));
    bounds.makeEmpty().expandByPoint(triangle.a).expandByPoint(triangle.b).expandByPoint(triangle.c);
    bvh.shapecast({intersectsBounds:b=>boxDistanceSquared(bounds,b)<=best,intersectsTriangle:t=>{pair(triangle,t);return false;}});
  }
  const intersects=A.box.intersectsBox(B.box)&&tree(A).intersectsGeometry(B.g,new T.Matrix4());
  return {distanceMetres:intersects?0:Math.sqrt(best),pointA:pointA?.toArray(),pointB:pointB?.toArray(),testedTrianglePairs:pairs,intersects,
    method:'Complete opaque triangle meshes in world metres. Independent vertex-to-face and all nine edge-to-edge distances with Float64 calculations; BVH node box-distance lower-bound pruning. Intersection test included separately.'};
}
