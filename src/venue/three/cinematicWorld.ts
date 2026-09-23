import * as THREE from "three";

/** One camera ray and clock for every LED face. No per-panel UVs, video loops,
 * ribbon geometry or scroll-driven playback. Reflected sculptures are actual
 * ray/sphere intersections in the virtual environment, not painted sprites. */
export function createCinematicMaterial(backdrop?: THREE.Texture, brightness = 1) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: {
      uBackdrop: { value: backdrop }, uBright: { value: brightness },
      uTime: { value: 0 }, uAlpha: { value: 1 },
      uEye: { value: new THREE.Vector3() },
      uPhase: { value: 0 }, uPortalZ: { value: 0 },
    },
    vertexShader: `varying vec3 vWorld;
      void main() { vec4 p = modelMatrix * vec4(position,1.0);
        vWorld=p.xyz; gl_Position=projectionMatrix*viewMatrix*p; }`,
    fragmentShader: `precision highp float;
      varying vec3 vWorld;
      uniform sampler2D uBackdrop;
      uniform vec3 uEye;
      uniform float uTime, uAlpha, uBright;
      const float PI=3.14159265359;
      // The complete 2:1 artwork belongs to the front 180 x 90 degrees,
      // not a 360-degree globe. Equal angular pixel density keeps it in proportion.
      const float PANORAMA_HORIZONTAL=PI;
      const float PANORAMA_VERTICAL=PI*.5;
      vec3 environment(vec3 d) {
        d=normalize(d);
        float yaw=atan(d.x,-d.z);
        float elevation=asin(clamp(d.y,-1.0,1.0));
        vec2 uv=vec2(yaw/PANORAMA_HORIZONTAL+.5,elevation/PANORAMA_VERTICAL+.5);
        // The rear hemisphere is unlit, never a repeated or mirrored copy.
        // Feather only the final degree of the front edges. Shared world rays
        // still give identical samples where wall, ceiling and floor meet.
        float front=1.0-smoothstep(PI*.5-.018,PI*.5,abs(yaw));
        vec3 rear=vec3(.008,.011,.016);
        if(front<=0.0) return rear;
        return mix(rear,texture2D(uBackdrop,clamp(uv,vec2(.0005),vec2(.9995))).rgb,front);
      }
      // Sculpture lighting is independent of the visible screen coverage.
      // Keep the original all-around reflection lookup so front-facing chrome
      // does not become a flat dark disk when it reflects toward the entrance.
      vec3 sculptureReflection(vec3 d) {
        d=normalize(d);
        vec2 uv=vec2(atan(d.x,-d.z)/(2.0*PI)+.5,asin(clamp(d.y,-1.0,1.0))/PI+.5);
        float seam=smoothstep(0.0,.025,min(uv.x,1.0-uv.x));
        return mix(texture2D(uBackdrop,vec2(.5,uv.y)).rgb,
          texture2D(uBackdrop,uv).rgb,seam);
      }
      float sphere(vec3 ro,vec3 rd,vec3 c,float r) {
        vec3 o=ro-c; float b=dot(o,rd), h=b*b-dot(o,o)+r*r;
        if(h<0.0) return 1e5;
        float t=-b-sqrt(h); return t>.05?t:1e5;
      }
      void main() {
        vec3 rd=normalize(vWorld-uEye);
        // Keep the 180-degree screen facing the tunnel exit (-Z). Sculptures
        // and dust retain their continuous animation without drifting the map.
        vec3 ro=vec3(uEye.x*.22,(uEye.y-1.8)*.22,uEye.z*.18);
        vec3 col=environment(rd);
        float nearest=1e5; vec3 centre=vec3(0.0); float radius=1.0;
        for(int i=0;i<3;i++) {
          float n=float(i);
          vec3 c=vec3((n-1.0)*14.0+2.4*sin(uTime*.09+n*2.0),
            5.0+n*3.4+1.8*cos(uTime*.11+n),-27.0-n*16.0);
          float r=2.0+n*.8, hit=sphere(ro,rd,c,r);
          if(hit<nearest) {nearest=hit;centre=c;radius=r;}
        }
        if(nearest<1e4) {
          vec3 normal=(ro+rd*nearest-centre)/radius;
          vec3 reflected=sculptureReflection(reflect(rd,normal));
          float fresnel=pow(1.0-max(0.0,dot(-rd,normal)),5.0);
          col=reflected*.84+vec3(.035,.043,.055)+fresnel*vec3(.2,.18,.14);
          float sun=pow(max(0.0,dot(reflect(rd,normal),normalize(vec3(-.6,.5,.3)))),100.0);
          col+=sun*vec3(.7,.55,.36);
        }
        // Sparse dust moving in the same 3D space, bounded periodic paths.
        for(int i=0;i<12;i++) {
          float n=float(i);
          vec3 p=vec3(18.0*sin(n*2.4+uTime*.025),
            8.0*sin(n*1.3+uTime*.04),-15.0-3.5*n);
          vec3 v=p-ro; float t=dot(v,rd);
          float distanceToRay=length(v-rd*t);
          float glint=exp(-distanceToRay*distanceToRay*500.0)*step(0.0,t);
          col+=glint*vec3(.23,.3,.38);
        }
        gl_FragColor=vec4(col*uBright,uAlpha);
        #include <colorspace_fragment>
      }`,
  });
}
