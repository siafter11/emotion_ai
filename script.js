// html 요소 가져오기
const video = document.getElementById('video');
const emotionEl = document.getElementById('emotion');
const confidenceEl = document.getElementById('confidence');
const metricsEl = document.getElementById('metrics');
const reasonEl = document.getElementById('reason');

const labels = [];
const values = [];

const chart = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
        labels,
        datasets: [{
            label: 'Confidence %',
            data: values
        }]
    }
});

// 감정 이름
const emotionNames = {
    happy: "행복",
    sad: "슬픔",
    angry: "화남",
    surprised: "놀람",
    fearful: "공포",
    disgusted: "혐오",
    neutral: "중립"
};

async function setup() {

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    });

    video.srcObject = stream;

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("./models"),
        faceapi.nets.faceExpressionNet.loadFromUri("./models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("./models")
    ]);

    setInterval(detect, 500);
}

// 가장 높은 감정 찾기
function topEmotion(expressions) {

    let best = "neutral";
    let max = 0;

    for (const key in expressions) {
        if (expressions[key] > max) {
            max = expressions[key];
            best = key;
        }
    }

    return { best, max };
}

async function detect() {

    const d = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions()
    )
    .withFaceLandmarks()
    .withFaceExpressions();

    if (!d) {
        emotionEl.textContent = "얼굴 미인식";
        confidenceEl.textContent = "";
        metricsEl.textContent = "";
        reasonEl.textContent = "";
        return;
    }

    let { best, max } = topEmotion(d.expressions);

    const e = d.expressions;

    // 입 좌표
    const mouth = d.landmarks.getMouth();

    const left = mouth[0];
    const right = mouth[6];

    const angle =
        Math.atan2(
            right.y - left.y,
            right.x - left.x
        ) * 180 / Math.PI;

    // 눈 개방도
    const eye = d.landmarks.getLeftEye();

    const openness =
        Math.abs(eye[1].y - eye[5].y) /
        Math.abs(eye[0].x - eye[3].x);

    const reasons = [];

    // -------------------
    // 중립 완화
    // -------------------

    if (best === "neutral" && max < 0.70) {

        if (e.happy > 0.15) {
            best = "happy";
        }

        else if (e.surprised > 0.12) {
            best = "surprised";
        }

        else if (e.sad > 0.10) {
            best = "sad";
        }

        else if (e.angry > 0.10) {
            best = "angry";
        }

        else if (e.fearful > 0.08) {
            best = "fearful";
        }

        else if (e.disgusted > 0.08) {
            best = "disgusted";
        }
    }

    // -------------------
    // 입꼬리 보정
    // -------------------

    if (angle < -1) {

        reasons.push("입꼬리가 올라감");

        if (best === "neutral")
            best = "happy";
    }

    if (angle > 1) {

        reasons.push("입꼬리가 내려감");

        if (best === "neutral")
            best = "sad";
    }

    // -------------------
    // 눈 보정
    // -------------------

    if (openness > 0.25) {

        reasons.push("눈이 크게 열림");

        if (best === "neutral")
            best = "surprised";
    }

    // AI 확률 근거

    reasons.push(`행복 ${(e.happy * 100).toFixed(0)}%`);
    reasons.push(`슬픔 ${(e.sad * 100).toFixed(0)}%`);
    reasons.push(`화남 ${(e.angry * 100).toFixed(0)}%`);
    reasons.push(`놀람 ${(e.surprised * 100).toFixed(0)}%`);

    // 화면 출력

    emotionEl.textContent =
        "감정 : " + emotionNames[best];

    confidenceEl.textContent =
        "신뢰도 : " + (max * 100).toFixed(1) + "%";

    metricsEl.textContent =
        `입꼬리 ${angle.toFixed(1)}° | 눈 개방도 ${openness.toFixed(2)}`;

    reasonEl.textContent =
        "판단 근거 : " + reasons.join(" / ");

    // 그래프

    labels.push(new Date().toLocaleTimeString());

    values.push((max * 100).toFixed(1));

    if (labels.length > 20) {
        labels.shift();
        values.shift();
    }

    chart.update();
}

setup();
