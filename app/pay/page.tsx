export default function PayPage() {
  return (
    <main className="min-h-screen bg-[#FFF8EE] flex flex-col items-center justify-center p-6">
      
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md text-center">

        <h1 className="text-3xl font-bold text-[#D97706] mb-4">
          解锁完整课程
        </h1>

        <p className="text-gray-600 mb-8">
          支付后即可永久观看全部内容
        </p>

        <div className="text-5xl mb-6">📱</div>

        <button
          className="w-full bg-green-500 hover:bg-green-600 text-white text-lg font-semibold py-4 rounded-full mb-4"
        >
          微信支付
        </button>

        <button
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-lg font-semibold py-4 rounded-full"
        >
          支付宝支付
        </button>

      </div>

    </main>
  );
}