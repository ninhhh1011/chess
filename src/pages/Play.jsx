import ChessGameBoard from '../components/ChessGameBoard';

export default function Play() {
  return <section>
    <h1 className="text-4xl font-black md:text-5xl">Chơi cờ</h1>
    <p className="mt-4 mb-8 max-w-3xl text-cream/70">Chế độ 2 người chơi trên cùng máy. Kéo thả quân cờ, hệ thống chỉ chấp nhận nước đi hợp lệ.</p>
    <ChessGameBoard />
  </section>;
}
