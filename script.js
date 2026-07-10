//html에서 자료 가져오기
const video=document.getElementById('video');//카메라 영상
const emotionEl=document.getElementById('emotion');//감정결과 출력
const confidenceEl=document.getElementById('confidence');//신뢰도 출력
const metricsEl=document.getElementById('metrics');//인식한 얼굴
const reasonEl=document.getElementById('reason');//감정 판단의 근거

const labels=[];//x축 시간
const values=[];//y축 신뢰도

const chart=new Chart(document.getElementById('chart'),{
 type:'line',
 data:{labels,datasets:[{label:'Confidence %',data:values}]}
});//선 그래프 생성

async function setup(){
 const stream=await navigator.mediaDevices.getUserMedia({video:true});//카메라 권한 요청
 video.srcObject=stream;//카메라 연결

 await Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models')
 ]);//얼굴인식모델,표정인식모델,얼굴좌표지정모델 불러오기

 setInterval(detect,1000);
}//1초마다 detect실행

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
   emotionEl.textContent='얼굴 미인식';
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
