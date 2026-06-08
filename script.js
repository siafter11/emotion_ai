
const video=document.getElementById('video');
const emotionEl=document.getElementById('emotion');
const confidenceEl=document.getElementById('confidence');
const metricsEl=document.getElementById('metrics');
const reasonEl=document.getElementById('reason');

const labels=[];
const values=[];

const chart=new Chart(document.getElementById('chart'),{
 type:'line',
 data:{labels,datasets:[{label:'Confidence %',data:values}]}
});

async function setup(){
 const stream=await navigator.mediaDevices.getUserMedia({video:true});
 video.srcObject=stream;

 await Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models')
 ]);

 setInterval(detect,1000);
}

function topEmotion(expressions){
 let best='neutral',max=0;
 for(const k in expressions){
   if(expressions[k]>max){max=expressions[k];best=k;}
 }
 return {best,max};
}

async function detect(){
 const d=await faceapi.detectSingleFace(
   video,new faceapi.TinyFaceDetectorOptions()
 ).withFaceLandmarks().withFaceExpressions();

 if(!d){
   emotionEl.textContent='얼굴 없음';
   return;
 }

 const {best,max}=topEmotion(d.expressions);

 const mouth=d.landmarks.getMouth();
 const left=mouth[0];
 const right=mouth[6];

 const angle=Math.atan2(
  right.y-left.y,
  right.x-left.x
 )*180/Math.PI;

 const eye=d.landmarks.getLeftEye();
 const openness=Math.abs(eye[1].y-eye[5].y)/Math.abs(eye[0].x-eye[3].x);

 let reasons=[];
 if(angle<-2) reasons.push('입꼬리 상승');
 if(angle>2) reasons.push('입꼬리 하강');
 if(openness>0.3) reasons.push('눈이 크게 열림');

 emotionEl.textContent='감정: '+best;
 confidenceEl.textContent='신뢰도: '+(max*100).toFixed(1)+'%';
 metricsEl.textContent=`입꼬리 각도 ${angle.toFixed(1)}°, 눈 개방도 ${openness.toFixed(2)}`;
 reasonEl.textContent='근거: '+(reasons.join(', ')||'특징 적음');

 labels.push(new Date().toLocaleTimeString());
 values.push((max*100).toFixed(1));
 if(labels.length>20){labels.shift();values.shift();}
 chart.update();
}

setup();
