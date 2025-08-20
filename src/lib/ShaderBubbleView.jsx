import { useEffect, useRef } from 'react';

function parseHsl(hsl){
  const m = /hsl\((\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\)/i.exec(hsl);
  if(!m) return [1,1,1];
  let h = parseFloat(m[1])/360;
  let s = parseFloat(m[2])/100;
  let l = parseFloat(m[3])/100;
  let r,g,b;
  if(s===0){ r=g=b=l; }
  else{
    const hue2rgb=(p,q,t)=>{
      if(t<0) t+=1;
      if(t>1) t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    const q=l<0.5?l*(1+s):l+s-l*s;
    const p=2*l-q;
    r=hue2rgb(p,q,h+1/3);
    g=hue2rgb(p,q,h);
    b=hue2rgb(p,q,h-1/3);
  }
  return [r,g,b];
}

export default function ShaderBubbleView({ items, pos, size, amountToRadius }){
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const bufferRef = useRef(null);

  useEffect(()=>{
    const canvas = canvasRef.current;
    if(!canvas) return;
    const gl = canvas.getContext('webgl');
    if(!gl) return;
    glRef.current = gl;
    const vsSource = `
      attribute vec2 a_position;
      uniform vec2 u_center;
      uniform vec2 u_scale;
      varying vec2 v_local;
      void main(){
        v_local = a_position;
        vec2 pos = a_position * u_scale + u_center;
        gl_Position = vec4(pos,0.0,1.0);
      }
    `;
    const fsSource = `
      precision mediump float;
      varying vec2 v_local;
      uniform vec3 u_color;
      void main(){
        float d = length(v_local);
        if(d>1.0) discard;
        gl_FragColor = vec4(u_color,1.0);
      }
    `;
    function compile(type,src){
      const s=gl.createShader(type);
      gl.shaderSource(s,src); gl.compileShader(s);
      return s;
    }
    const vs=compile(gl.VERTEX_SHADER,vsSource);
    const fs=compile(gl.FRAGMENT_SHADER,fsSource);
    const prog=gl.createProgram();
    gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.linkProgram(prog);
    gl.deleteShader(vs); gl.deleteShader(fs);
    programRef.current = prog;
    const buf=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),gl.STATIC_DRAW);
    const aPos=gl.getAttribLocation(prog,'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
    bufferRef.current = buf;
    return ()=>{
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  },[]);

  useEffect(()=>{
    const canvas = canvasRef.current;
    const gl = glRef.current;
    const prog = programRef.current;
    if(!canvas || !gl || !prog) return;
    canvas.width = size.w;
    canvas.height = size.h;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const uCenter=gl.getUniformLocation(prog,'u_center');
    const uScale=gl.getUniformLocation(prog,'u_scale');
    const uColor=gl.getUniformLocation(prog,'u_color');
    for(const it of items){
      const p=pos.get(it.id);
      if(!p) continue;
      const r=amountToRadius(it.amount);
      const cx=(p.x/size.w)*2-1;
      const cy=(1-p.y/size.h)*2-1;
      const sx=r/size.w*2;
      const sy=r/size.h*2;
      const [rr,gg,bb]=parseHsl(it.color);
      gl.uniform2f(uCenter,cx,cy);
      gl.uniform2f(uScale,sx,sy);
      gl.uniform3f(uColor,rr,gg,bb);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
  },[items,pos,size,amountToRadius]);

  return <canvas ref={canvasRef} className="w-full h-full"/>;
}
