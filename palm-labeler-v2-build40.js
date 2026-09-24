
const $=id=>document.getElementById(id),canvas=$("canvas"),ctx=canvas.getContext("2d");
let img=null,meta=null,current=[],annotations={life:[],head:[],heart:[],fate:[],sun:[],wealth:[],marriage:[]};
const COLORS={life:"#2f9a61",head:"#2979ba",heart:"#d94b62",fate:"#b98a2c",sun:"#8f59b7",wealth:"#5c7e68",marriage:"#cd7180"};
async function sha256(file){const b=await file.arrayBuffer(),h=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function redraw(){
 ctx.clearRect(0,0,canvas.width,canvas.height);if(!img)return;ctx.drawImage(img,0,0,canvas.width,canvas.height);
 ctx.lineWidth=Math.max(2,canvas.width/300);ctx.lineCap="round";ctx.lineJoin="round";
 for(const [k,lines] of Object.entries(annotations)){ctx.strokeStyle=COLORS[k];for(const l of lines)draw(l.points)}
 ctx.strokeStyle=COLORS[$("label").value];draw(current);
}
function draw(points){if(points.length<1)return;ctx.beginPath();for(let i=0;i<points.length;i++){const [x,y]=points[i];const X=x*canvas.width,Y=y*canvas.height;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y)}ctx.stroke()}
function pointFromEvent(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))]}
$("file").addEventListener("change",async()=>{const f=$("file").files?.[0];if(!f)return;const url=URL.createObjectURL(f),im=new Image();im.onload=async()=>{img=im;canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;meta={sha256:await sha256(f),width:im.naturalWidth,height:im.naturalHeight,fileName:f.name};$("empty").hidden=true;redraw();URL.revokeObjectURL(url)};im.src=url});
canvas.addEventListener("pointerdown",e=>{if(!img)return;current.push(pointFromEvent(e));redraw()});
$("undo").onclick=()=>{current.pop();redraw()};
$("clear").onclick=()=>{current=[];redraw()};
$("newLine").onclick=()=>{if(current.length<2){$("status").textContent="2点以上指定してください。";return}annotations[$("label").value].push({points:current,visibility:$("visibility").value,note:""});current=[];$("status").textContent="線を確定しました。";redraw()};
$("label").onchange=redraw;
$("export").onclick=()=>{
 if(!meta){$("status").textContent="画像がありません。";return}
 if(!$("subjectConsent").checked||!$("commercialEval").checked){$("status").textContent="被写体同意と商用品質評価の利用許可が必要です。";return}
 if(current.length>=2)$("newLine").click();
 const sg=$("subjectGroup").value.trim();if(sg.length<8){$("status").textContent="匿名Subject Groupを8文字以上で入力してください。";return} const out={version:"palm-golden-v1",image:meta,subjectGroup:sg,handSide:$("handSide").value,rights:{subjectConsent:true,commercialEvaluationAllowed:true,trainingAllowed:$("trainingAllowed").checked,sourceNote:$("sourceNote").value.trim()},annotations};
 const blob=new Blob([JSON.stringify(out,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`palm-golden-${meta.sha256.slice(0,12)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 $("status").textContent="Annotation JSONを作成しました。";
};
