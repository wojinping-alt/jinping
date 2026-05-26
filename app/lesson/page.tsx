"use client";

import { useState } from "react";

export default function LessonPage() {
  const [isPurchased, setIsPurchased] = useState(false);

  return (
    <main className="min-h-screen bg-[#FFF8EE] p-6">
      
      {/* 标题 */}
      <h1 className="text-3xl font-bold text-[#D97706] mb-4">
        第一课：日月水火
      </h1>

      <p className="text-[#6B4F3B] mb-6">
        理解汉字背后的文化与演变
      </p>

      {/* 视频区域 */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6">

        {!isPurchased ? (
          <>
            {/* 试看 */}
            <p className="text-orange-500 font-semibold mb-3">
              当前为试看内容（30秒）
            </p>

            <video
              controls
              className="w-full rounded-xl"
              src="https://1309315684.vod-qcloud.com/3f7f1c6avodcq1309315684/1703f4465145403728064556565/mwLgypzW46IA.mp4"
            />

            <button
              onClick={() => setIsPurchased(true)}
              className="w-full mt-5 bg-[#F59E0B] hover:bg-[#D97706] text-white text-lg font-semibold py-4 rounded-full"
            >
              微信/支付宝购买
            </button>
          </>
        ) : (
          <>
            {/* 完整课程 */}
            <p className="text-green-600 font-semibold mb-3">
              已解锁完整课程
            </p>

            <video
              controls
              className="w-full rounded-xl"
              src="https://1309315684.vod-qcloud.com/3f7f1c6avodcq1309315684/1703f4465145403728064556565/mwLgypzW46IA.mp4"
            />
          </>
        )}
      </div>

    </main>
  );
}