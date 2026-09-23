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
      vec3 environment(vec3 d) {
        d=normalize(d);
        vec2 uv=vec2(atan(d.x,-d.z)/(2.0*PI)+.5,asin(clamp(d.y,-1.0,1.0))/PI+.5);
        // The narrow back meridian blends to a common sample at both ends.
        // Floor/wall/ceiling corners need no blend: their rays are identical.
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
        // Slow cinematic orbit, continuous in time even when the visitor stops.
        float a=.035*sin(uTime*.055);
        rd.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*rd.xz;
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
          vec3 reflected=environment(reflect(rd,normal));
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
