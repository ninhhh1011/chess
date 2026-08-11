import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/userProfileService';
import logoImg from '../assets/avatarcoach.webp';
import { BRAND_NAMES, brandName, BRAND_TAGLINE, BRAND_DESCRIPTION } from '../config/brand';
import { createGame } from '../services/onlineGameService';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    icon: '📚',
    title: 'Học cờ từ cơ bản',
    description: 'Nắm vững luật cờ, cách di chuyển quân và chiến thuật cơ bản.',
    link: '/learn',
  },
  {
    icon: '🎯',
    title: 'Luyện bài tập',
    description: 'Giải các bài tập chiến thuật để nâng cao kỹ năng.',
    link: '/exercises',
  },
  {
    icon: '♟️',
    title: `Đấu với ${BRAND_NAMES.bot}`,
    description: 'Thực hành với bot AI từ dễ đến khó, gáy vừa đủ.',
    link: '/play',
  },
  {
    icon: '📖',
    title: BRAND_NAMES.openingTrainer,
    description: 'Nắm vững khai cuộc phổ biến và ý tưởng chính.',
    link: '/openings',
  },
  {
    icon: '🎓',
    title: 'Huấn luyện cá nhân',
    description: 'Lộ trình học tập được cá nhân hóa theo trình độ.',
    link: '/training',
  },
  {
    icon: '🤖',
    title: BRAND_NAMES.coach,
    description: 'Trợ lý AI giúp bạn phân tích và sửa nước thiếu lực.',
    link: '/play',
  },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setProfile(getUserProfile());
  }, []);

  const handleCreateOnlineGame = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      setIsCreatingGame(true);
      const { gameId } = await createGame(user.id);
      navigate(`/play/online/${gameId}`);
    } catch (error) {
      console.error(error);
      setIsCreatingGame(false);
      alert('Failed to create online game');
    }
  };

  return (
    <div className="space-y-14 py-6">
      {/* Hero Section */}
      <section className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-950 px-3 py-2 text-sm font-medium text-emerald-300">
            <img src={logoImg} alt={brandName} className="h-5 w-5 rounded object-cover" />
            {BRAND_TAGLINE}
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight text-slate-100 md:text-7xl">
            {brandName}
          </h1>
          
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-400">
            {BRAND_DESCRIPTION}
          </p>

          {isAuthenticated && profile && (
            <div className="mt-8 rounded-lg border border-slate-700/70 bg-slate-950/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tiến độ của bạn</p>
              <div className="mt-3 flex items-center gap-8">
                <div>
                  <p className="text-2xl font-bold text-slate-100">{profile.gamesPlayed}</p>
                  <p className="text-sm text-slate-400">Ván đã chơi</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100 capitalize">{profile.currentLevel}</p>
                  <p className="text-sm text-slate-400">Trình độ</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-100">{profile.exerciseStats.accuracy}%</p>
                  <p className="text-sm text-slate-400">Độ chính xác</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            <Link className="btn-primary text-base" to="/learn">
              Bắt đầu học
            </Link>
            <Link className="btn-secondary text-base" to="/play">
              Chơi ngay
            </Link>
            <button 
              className="btn-secondary gap-2 text-base"
              onClick={handleCreateOnlineGame}
              disabled={isCreatingGame}
            >
              {isCreatingGame ? 'Đang tạo ván...' : 'Chơi Online'}
              <span className="rounded border border-amber-300/25 bg-amber-300/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-amber-200">
                Beta
              </span>
            </button>
            <Link className="btn-secondary text-base hidden sm:inline-block" to="/training">
              Huấn luyện
            </Link>
          </div>
        </div>

        {/* Chess board preview */}
        <div className="relative">
          <div className="relative rounded-lg border border-slate-700/70 bg-slate-950/70 p-3 shadow-[0_18px_50px_rgba(2,6,23,0.36)]">
            <div className="grid grid-cols-8 overflow-hidden rounded-lg border border-slate-700/80">
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isDark = (row + col) % 2 === 1;
                
                let piece = '';
                if (i === 0 || i === 7) piece = '♜';
                else if (i === 1 || i === 6) piece = '♞';
                else if (i === 2 || i === 5) piece = '♝';
                else if (i === 3) piece = '♛';
                else if (i === 4) piece = '♚';
                else if (i >= 8 && i <= 15) piece = '♟';
                else if (i >= 48 && i <= 55) piece = '♙';
                else if (i === 56 || i === 63) piece = '♖';
                else if (i === 57 || i === 62) piece = '♘';
                else if (i === 58 || i === 61) piece = '♗';
                else if (i === 59) piece = '♕';
                else if (i === 60) piece = '♔';

                return (
                  <div
                    key={i}
                    className={`aspect-square grid place-items-center text-4xl transition-transform hover:scale-105 ${
                      isDark ? 'bg-slate-600' : 'bg-slate-300 text-slate-900'
                    }`}
                  >
                    {piece}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="pt-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-slate-100 md:text-4xl">Tính năng nổi bật</h2>
          <p className="mt-4 text-slate-400">Mọi thứ bạn cần để trở thành cao thủ cờ vua</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Link
              key={index}
              to={feature.link}
              className="group rounded-lg border border-slate-800 bg-slate-950/70 p-5 transition-all hover:border-slate-600 hover:bg-slate-900"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900 text-2xl group-hover:bg-slate-800">
                {feature.icon}
              </div>
              
              <h3 className="text-lg font-bold text-slate-100">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.description}</p>
              
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-500 transition-all group-hover:gap-3">
                Khám phá
                <span>→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-lg border border-slate-800 bg-slate-950/70 p-8 text-center sm:p-10">
        <h2 className="text-3xl font-bold text-slate-100 md:text-4xl">Sẵn sàng bắt đầu?</h2>
        <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-300">
          Chơi một ván, nhận nhận xét ngắn gọn, rồi luyện lại điểm yếu quan trọng nhất cùng Ninh.
        </p>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {!isAuthenticated ? (
            <>
              <Link className="btn-primary text-base" to="/signup">
                Tạo tài khoản miễn phí
              </Link>
              <Link className="btn-secondary text-base" to="/learn">
                Học ngay không cần đăng ký
              </Link>
            </>
          ) : (
            <Link className="btn-primary text-base" to="/training">
              Tiếp tục học tập
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
