import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/userProfileService';

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
    title: 'Chơi với Bot',
    description: 'Thực hành với bot AI từ dễ đến khó.',
    link: '/play',
  },
  {
    icon: '📖',
    title: 'Học khai cuộc',
    description: 'Nắm vững các khai cuộc phổ biến và chiến lược.',
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
    title: 'AI Coach',
    description: 'Trợ lý AI giúp bạn phân tích và cải thiện.',
    link: '/play',
  },
];

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setShowWelcome(false);
    }, 3600);

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    setProfile(getUserProfile());
  }, []);

  return (
    <div className="space-y-16">
      {/* Welcome notification */}
      {showWelcome && (
        <div className="fixed left-1/2 top-24 z-50 max-w-[90vw] -translate-x-1/2 animate-[notice-pop_3.6s_ease-in-out_forwards] rounded-[2rem] border border-gold/40 bg-ink/90 px-6 py-4 text-center text-lg font-black text-gold shadow-glow backdrop-blur-xl md:text-xl">
          ♔ Chào mừng đến với Vua Cờ
        </div>
      )}

      {/* Hero Section */}
      <section className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gradient-to-r from-gold/20 to-amber-700/20 px-5 py-2.5 text-sm font-bold text-gold backdrop-blur">
            <span className="text-xl">♔</span>
            Ứng dụng học cờ vua cho người Việt
          </div>
          
          <h1 className="bg-gradient-to-br from-cream via-gold to-amber-400 bg-clip-text text-6xl font-black tracking-tight text-transparent md:text-8xl">
            Vua Cờ
          </h1>
          
          <p className="mt-6 max-w-2xl text-xl leading-9 text-cream/80">
            Học cờ vua từ cơ bản đến nâng cao, luyện chiến thuật và chơi với AI thông minh ngay trên trình duyệt.
          </p>

          {isAuthenticated && profile && (
            <div className="mt-6 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-amber-700/10 p-4 backdrop-blur">
              <p className="text-sm font-bold uppercase tracking-wider text-gold/70">Tiến độ của bạn</p>
              <div className="mt-2 flex items-center gap-6">
                <div>
                  <p className="text-2xl font-black text-cream">{profile.gamesPlayed}</p>
                  <p className="text-xs text-cream/60">Ván đã chơi</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-cream capitalize">{profile.currentLevel}</p>
                  <p className="text-xs text-cream/60">Trình độ</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-cream">{profile.exerciseStats.accuracy}%</p>
                  <p className="text-xs text-cream/60">Độ chính xác</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            <Link className="btn-primary text-lg" to="/learn">
              Bắt đầu học
            </Link>
            <Link className="btn-secondary text-lg" to="/play">
              Chơi ngay
            </Link>
            <Link className="btn-secondary text-lg" to="/training">
              Huấn luyện
            </Link>
          </div>
        </div>

        {/* Chess board preview */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-[3rem] bg-gradient-to-br from-gold/20 to-amber-700/20 blur-2xl"></div>
          <div className="relative rounded-[2.5rem] border border-gold/30 bg-white/[.08] p-8 shadow-glow backdrop-blur">
            <div className="grid grid-cols-8 overflow-hidden rounded-3xl border-2 border-gold/40 shadow-2xl">
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
                    className={`aspect-square grid place-items-center text-4xl transition-all hover:scale-110 ${
                      isDark ? 'bg-[#7a4f2d]' : 'bg-[#f7e4bf]'
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
      <section>
        <div className="mb-10 text-center">
          <h2 className="text-4xl font-black text-cream md:text-5xl">Tính năng nổi bật</h2>
          <p className="mt-4 text-lg text-cream/70">Mọi thứ bạn cần để trở thành cao thủ cờ vua</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Link
              key={index}
              to={feature.link}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[.05] p-6 backdrop-blur transition-all hover:scale-105 hover:border-gold/30 hover:bg-white/[.08] hover:shadow-glow"
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-gold/20 to-transparent blur-2xl transition-all group-hover:scale-150"></div>
              
              <div className="relative">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/20 to-amber-700/20 text-4xl backdrop-blur">
                  {feature.icon}
                </div>
                
                <h3 className="text-xl font-black text-cream">{feature.title}</h3>
                <p className="mt-2 leading-7 text-cream/70">{feature.description}</p>
                
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-gold transition-all group-hover:gap-3">
                  Khám phá
                  <span>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden rounded-[3rem] border border-gold/30 bg-gradient-to-br from-gold/10 via-amber-700/10 to-gold/5 p-12 text-center backdrop-blur">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(214,167,75,.15),transparent_50%)]"></div>
        
        <div className="relative">
          <h2 className="text-4xl font-black text-cream md:text-5xl">Sẵn sàng bắt đầu?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-cream/70">
            Tham gia cùng hàng nghìn người học cờ vua mỗi ngày. Hoàn toàn miễn phí, không cần đăng ký.
          </p>
          
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {!isAuthenticated ? (
              <>
                <Link className="btn-primary text-lg" to="/signup">
                  Tạo tài khoản miễn phí
                </Link>
                <Link className="btn-secondary text-lg" to="/learn">
                  Học ngay không cần đăng ký
                </Link>
              </>
            ) : (
              <Link className="btn-primary text-lg" to="/training">
                Tiếp tục học tập
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
