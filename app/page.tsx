'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';

export default function Home() {
  const title = "BREAK IT DOWN!";
  const letters = title.split('');

  // 跟踪每个字母的位置
  const [letterPositions, setLetterPositions] = useState<{ [key: number]: { x: number; y: number } }>({});
  const [buttonPositions, setButtonPositions] = useState<{ start: { x: number; y: number }, about: { x: number; y: number } }>({
    start: { x: 0, y: 0 },
    about: { x: 0, y: 0 }
  });

  const startButtonRef = useRef<HTMLDivElement>(null);
  const aboutButtonRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 获取按钮位置
  useEffect(() => {
    const updateButtonPositions = () => {
      if (startButtonRef.current && aboutButtonRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const startRect = startButtonRef.current.getBoundingClientRect();
        const aboutRect = aboutButtonRef.current.getBoundingClientRect();

        setButtonPositions({
          start: {
            x: startRect.left + startRect.width / 2 - containerRect.left,
            y: startRect.top + startRect.height / 2 - containerRect.top
          },
          about: {
            x: aboutRect.left + aboutRect.width / 2 - containerRect.left,
            y: aboutRect.top + aboutRect.height / 2 - containerRect.top
          }
        });
      }
    };

    updateButtonPositions();
    window.addEventListener('resize', updateButtonPositions);
    return () => window.removeEventListener('resize', updateButtonPositions);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2,
      }
    }
  };

  const letterVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.5,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      }
    }
  };

  const buttonVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 2,
        duration: 0.6,
      }
    }
  };

  return (
    <main ref={containerRef} className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* 背景装饰 - 树状网格线 */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <circle cx="25" cy="25" r="1" fill="#8b5cf6" opacity="0.3"/>
            </pattern>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* 装饰性连接线 */}
          <line x1="10%" y1="20%" x2="30%" y2="40%" stroke="url(#lineGradient)" strokeWidth="1" opacity="0.3"/>
          <line x1="70%" y1="30%" x2="90%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" opacity="0.3"/>
          <line x1="20%" y1="70%" x2="40%" y2="90%" stroke="url(#lineGradient)" strokeWidth="1" opacity="0.3"/>
          <line x1="60%" y1="60%" x2="80%" y2="80%" stroke="url(#lineGradient)" strokeWidth="1" opacity="0.3"/>
        </svg>
      </div>

      {/* 连接线层 - SVG */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
        {Object.entries(letterPositions).map(([index, pos]) => {
          const letterIndex = parseInt(index);
          const nonSpaceIndex = letters.slice(0, letterIndex + 1).filter(l => l !== ' ').length - 1;
          const totalNonSpace = letters.filter(l => l !== ' ').length;
          const isLeftHalf = nonSpaceIndex < Math.ceil(totalNonSpace / 2);
          const targetPos = isLeftHalf ? buttonPositions.start : buttonPositions.about;

          if (letters[letterIndex] === ' ') return null;

          // 创建直角转弯路径
          const midY = pos.y + (targetPos.y - pos.y) * 0.5;
          const pathData = `M ${pos.x} ${pos.y} L ${pos.x} ${midY} L ${targetPos.x} ${midY} L ${targetPos.x} ${targetPos.y}`;

          return (
            <path
              key={`line-${index}`}
              d={pathData}
              stroke="#60a5fa"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
              opacity="0.4"
            />
          );
        })}
      </svg>

      {/* 主内容 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        {/* 标题 - 树状节点风格 */}
        <motion.div
          className="mb-8 relative"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 relative" style={{ zIndex: 1 }}>
            {letters.map((letter, index) => (
              <motion.div
                key={index}
                variants={letterVariants}
                drag
                dragMomentum={false}
                dragElastic={0.1}
                onDrag={(event) => {
                  if (containerRef.current) {
                    const containerRect = containerRef.current.getBoundingClientRect();
                    const element = event.target as HTMLElement;
                    const rect = element.getBoundingClientRect();
                    setLetterPositions(prev => ({
                      ...prev,
                      [index]: {
                        x: rect.left + rect.width / 2 - containerRect.left,
                        y: rect.top + rect.height / 2 - containerRect.top
                      }
                    }));
                  }
                }}
                className="relative group cursor-move"
              >
                {/* 节点圆圈背景 */}
                <div className={`
                  absolute inset-0 rounded-full
                  bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20
                  border-2 border-purple-400/50
                  backdrop-blur-sm
                  transition-all duration-300
                  group-hover:scale-110 group-hover:border-purple-400
                  ${letter === ' ' ? 'opacity-0' : ''}
                `} style={{
                  width: letter === ' ' ? '2rem' : '7rem',
                  height: letter === ' ' ? '2rem' : '7rem',
                  transform: 'translate(-50%, -50%)',
                  left: '50%',
                  top: '50%',
                }}></div>

                {/* 字母 */}
                <span
                  className={`
                    relative z-10 text-4xl md:text-6xl lg:text-7xl font-black
                    ${letter === ' ' ? 'w-8 md:w-12' : ''}
                    bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400
                    transition-all duration-300
                    group-hover:scale-110
                  `}
                  style={{
                    textShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
                    display: 'inline-block',
                    minWidth: letter === ' ' ? '2rem' : '4rem',
                    textAlign: 'center',
                  }}
                >
                  {letter === ' ' ? '\u00A0' : letter}
                </span>

                {/* 节点光晕效果 */}
                {letter !== ' ' && (
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
                    width: '7rem',
                    height: '7rem',
                    transform: 'translate(-50%, -50%)',
                    left: '50%',
                    top: '50%',
                  }}></div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 副标题 */}
        <motion.p
          className="text-xl md:text-2xl text-gray-300 mb-12 text-center max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          探索万物的本质 · 从复杂到简单的逆熵之旅
        </motion.p>

        {/* 按钮组 */}
        <motion.div
          className="flex flex-col sm:flex-row gap-6"
          variants={buttonVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 开始体验按钮 */}
          <div ref={startButtonRef}>
            <Link href="/deconstruct">
              <motion.button
                className="px-12 py-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-bold text-xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 relative overflow-hidden group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10">🚀 开始体验</span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </motion.button>
            </Link>
          </div>

          {/* 关于我们按钮 */}
          <div ref={aboutButtonRef}>
            <Link href="/about">
              <motion.button
                className="px-12 py-5 bg-white/10 backdrop-blur-lg border-2 border-white/20 rounded-xl font-bold text-xl hover:bg-white/20 hover:border-white/40 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                💡 关于我们
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* 底部提示 */}
        <motion.div
          className="absolute bottom-8 text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5, duration: 1 }}
        >
          <p>Powered by AI · Next.js · React Flow</p>
        </motion.div>
      </div>
    </main>
  );
}
