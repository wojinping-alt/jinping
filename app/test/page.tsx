export default function TestVideoPage() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-6">
        视频播放测试
      </h1>

      <video
        className="w-full max-w-3xl rounded-xl"
        controls
        src="https://1309315684.vod-qcloud.com/3f7f1c6avodcq1309315684/1703f4465145403728064556565/mwLgypzW46IA.mp4"
      />
    </div>
  );
}