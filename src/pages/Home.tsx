import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Brain, BookOpen, Trophy, ChevronRight, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, Button } from '@/design-system/primitives';
import { staggerContainer, fadeInUp } from '@/design-system/animations';

const features = [
  {
    icon: Play,
    title: 'Chơi với Bot',
    description: 'Đấu với Ninh Lốp Trưởng ở nhiều cấp độ ELO khác nhau',
    to: '/play',
    color: 'text-primary-500',
    bg: 'bg-primary-500/10',
  },
  {
    icon: BookOpen,
    title: 'Học cờ',
    description: 'Các bài học từ cơ bản đến nâng cao, có hình ảnh minh họa',
    to: '/learn',
    color: 'text-accent-500',
    bg: 'bg-accent-500/10',
  },
  {
    icon: Brain,
    title: 'Bài tập',
    description: 'Luyện tập tactics để cải thiện khả năng tính toán',
    to: '/exercises',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icon: Trophy,
    title: 'Khai cuộc',
    description: 'Học và luyện tập các khai cuộc phổ biến',
    to: '/openings',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-bg-elevated via-bg-surface to-bg-elevated border border-border p-8 md:p-12 lg:p-16"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-500"
          >
            <Sparkles className="h-4 w-4" />
            Ứng dụng cờ vua hàng đầu
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 text-4xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl"
          >
            Ninh Lốp Trưởng{' '}
            <span className="bg-gradient-to-r from-primary-500 to-primary-400 bg-clip-text text-transparent">
              Chess
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 text-lg text-text-secondary md:text-xl"
          >
            Nâng cao trình độ cờ vua với Bot thông minh, bài học chi tiết và
            bài tập tactics hiệu quả
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Button
              size="lg"
              onClick={() => navigate('/play')}
              rightIcon={<ChevronRight className="h-5 w-5" />}
              className="w-full sm:w-auto"
            >
              Bắt đầu chơi
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/learn')}
              className="w-full sm:w-auto"
            >
              Khám phá
            </Button>
          </motion.div>
        </div>
      </motion.section>

      {/* Features Grid */}
      <section>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 text-center text-2xl font-semibold text-text-primary md:text-3xl"
        >
          Khám phá tính năng
        </motion.h2>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => (
            <motion.div key={feature.to} variants={fadeInUp}>
              <Card
                variant="elevated"
                padding="none"
                className="group cursor-pointer transition-shadow hover:shadow-lg hover:shadow-black/20"
                onClick={() => navigate(feature.to)}
              >
                <div className="p-6">
                  <div
                    className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="mb-2 group-hover:text-primary-500 transition-colors">
                    {feature.title}
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </div>
                <div className="border-t border-border px-6 py-4">
                  <span className="flex items-center gap-1 text-sm font-medium text-primary-500 opacity-0 transition-opacity group-hover:opacity-100">
                    Khám phá <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
