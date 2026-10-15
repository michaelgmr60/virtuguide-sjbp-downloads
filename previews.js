'use strict';
const model=document.getElementById('shs-preview');
const modelStatus=document.getElementById('model-status');
const modelLoad=document.getElementById('load-shs');
if(model){
 let loading=false;
 modelLoad.addEventListener('click',async()=>{
  if(loading)return;loading=true;modelLoad.disabled=true;modelStatus.textContent='Loading SHS and court…';
  try{
   await import('./vendor/model-viewer.min.js');
   await customElements.whenDefined('model-viewer');
   model.addEventListener('load',()=>{modelLoad.hidden=true;document.getElementById('shs-poster').hidden=true;model.tabIndex=0;modelStatus.textContent='Drag to rotate · pinch or scroll to zoom';model.dataset.ready='true';},{once:true});
   model.addEventListener('error',()=>{loading=false;modelLoad.disabled=false;modelStatus.textContent='3D preview unavailable. The fresh Unity screenshot is shown below.';},{once:true});
   model.src='assets/shs-court.glb';
  }catch{loading=false;modelLoad.disabled=false;modelStatus.textContent='3D preview could not load. Please try again.';}
 });
 document.getElementById('reset-shs').addEventListener('click',()=>{
  model.cameraOrbit='-65deg 65deg 105%';model.fieldOfView='30deg';model.jumpCameraToGoal?.();
 });
}

class EntrancePanorama{
 constructor(canvas){this.canvas=canvas;this.yaw=0;this.pitch=0;this.fov=75;this.loaded=false;this.active=false;this.pointers=new Map();this.frame=0;this.bind();}
 bind(){
  const c=this.canvas;
  c.addEventListener('pointerdown',e=>{if(!this.loaded)return;c.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});});
  c.addEventListener('pointermove',e=>{const old=this.pointers.get(e.pointerId);if(!old)return;this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.yaw-=(e.clientX-old.x)*.0045;this.pitch=Math.max(-1.25,Math.min(1.25,this.pitch+(e.clientY-old.y)*.0045));this.draw();});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(type,e=>this.pointers.delete(e.pointerId));
  c.addEventListener('wheel',e=>{if(!this.loaded)return;e.preventDefault();this.fov=Math.max(45,Math.min(100,this.fov+Math.sign(e.deltaY)*4));this.draw();},{passive:false});
  c.addEventListener('keydown',e=>{
   const step=.12;let handled=true;
   if(e.key==='ArrowLeft')this.yaw-=step;else if(e.key==='ArrowRight')this.yaw+=step;else if(e.key==='ArrowUp')this.pitch=Math.min(1.25,this.pitch+step);else if(e.key==='ArrowDown')this.pitch=Math.max(-1.25,this.pitch-step);else if(e.key==='+'||e.key==='=')this.fov=Math.max(45,this.fov-5);else if(e.key==='-')this.fov=Math.min(100,this.fov+5);else if(e.key==='Home')this.reset();else handled=false;
   if(handled){e.preventDefault();this.draw();}
  });
  c.addEventListener('webglcontextlost',e=>{e.preventDefault();this.loaded=false;document.getElementById('pano-status').textContent='360° graphics paused. Reload the page to try again.';});
  this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(c);
 }
 async load(){
  if(this.loaded)return;
  const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('WebGL unavailable');this.gl=gl;
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const vertex=shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 v;void main(){v=p;gl_Position=vec4(p,0.,1.);}');
  const fragment=shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 v;uniform sampler2D image;uniform float yaw;uniform float pitch;uniform float fov;uniform float aspect;void main(){float t=tan(fov*.5);vec3 d=normalize(vec3(v.x*aspect*t,v.y*t,1.));float cp=cos(pitch),sp=sin(pitch);d=vec3(d.x,d.y*cp+d.z*sp,-d.y*sp+d.z*cp);float cy=cos(yaw),sy=sin(yaw);d=vec3(d.x*cy+d.z*sy,d.y,-d.x*sy+d.z*cy);vec2 uv=vec2(atan(d.x,d.z)/6.28318530718+.5,.5-asin(clamp(d.y,-1.,1.))/3.14159265359);gl_FragColor=texture2D(image,uv);}`);
  const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));this.program=program;
  gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const location=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
  const image=new Image();image.src='assets/entrance-360.jpg';await image.decode();
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
  this.loaded=true;this.canvas.hidden=false;this.canvas.dataset.ready='true';this.draw();
 }
 draw(){
  if(!this.loaded||document.getElementById('tour-panel').hidden)return;
  const gl=this.gl,c=this.canvas,r=c.getBoundingClientRect();if(r.width<1||r.height<1)return;
  const ratio=Math.min(devicePixelRatio||1,1.5);c.width=Math.round(r.width*ratio);c.height=Math.round(r.height*ratio);gl.viewport(0,0,c.width,c.height);gl.useProgram(this.program);
  for(const [name,value]of Object.entries({yaw:this.yaw,pitch:this.pitch,fov:this.fov*Math.PI/180,aspect:c.width/c.height}))gl.uniform1f(gl.getUniformLocation(this.program,name),value);
  gl.drawArrays(gl.TRIANGLES,0,6);c.dataset.yaw=String(this.yaw);c.dataset.pitch=String(this.pitch);c.dataset.fov=String(this.fov);
 }
 reset(){this.yaw=0;this.pitch=0;this.fov=75;this.draw();}
}
const panoramaCanvas=document.getElementById('entrance-panorama');
if(panoramaCanvas){
 const viewer=new EntrancePanorama(panoramaCanvas),button=document.getElementById('load-panorama'),status=document.getElementById('pano-status');
 button.addEventListener('click',async()=>{button.disabled=true;status.textContent='Loading the entrance view…';try{await viewer.load();button.hidden=true;document.getElementById('entrance-poster').hidden=true;status.textContent='Drag to look around · arrow keys also work · entrance preview only';panoramaCanvas.focus({preventScroll:true});}catch{button.disabled=false;status.textContent='360° preview unavailable. The fresh Unity screenshot remains available.';}});
 document.getElementById('reset-panorama').addEventListener('click',()=>viewer.reset());
 document.getElementById('pano-zoom-in').addEventListener('click',()=>{viewer.fov=Math.max(45,viewer.fov-5);viewer.draw();});
 document.getElementById('pano-zoom-out').addEventListener('click',()=>{viewer.fov=Math.min(100,viewer.fov+5);viewer.draw();});
 for(const tab of document.querySelectorAll('[role=tab]'))tab.addEventListener('click',()=>requestAnimationFrame(()=>viewer.draw()));
}
