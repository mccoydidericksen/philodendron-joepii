'use client';

import { useState } from 'react';
import { DemoLoginModal } from '@/components/DemoLoginModal';
import { EmojiBackground } from '@/components/EmojiBackground';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function HomePage() {
  const [showDemoModal, setShowDemoModal] = useState(false);

  const features = [
    {
      icon: '🏷️',
      title: 'Track Unlimited Plants',
      description: 'Add and manage as many plants as you want with detailed profiles for each one.',
    },
    {
      icon: '📅',
      title: 'Automated Care Schedules',
      description: 'Set up custom watering, fertilizing, and maintenance schedules that adapt to each plant\'s needs.',
    },
    {
      icon: '🔔',
      title: 'Smart Reminders',
      description: 'Never miss a care task with intelligent notifications that keep your plants healthy.',
    },
    {
      icon: '📈',
      title: 'Growth Tracking & Analytics',
      description: 'Monitor your plants\' progress over time with visual insights and statistics.',
    },
    {
      icon: '⭐',
      title: 'Favorite Plants Dashboard',
      description: 'Quick access to your most-loved plants right from your main dashboard.',
    },
    {
      icon: '📄',
      title: 'Bulk Plant Import',
      description: 'Easily import multiple plants at once using CSV files for efficient setup.',
    },
  ];

  return (
    <>
      <EmojiBackground />
      <div className="relative flex min-h-screen flex-col items-center justify-center p-8">
        <div className="mx-auto max-w-2xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1
              className="mb-4 text-6xl md:text-7xl font-bold text-moss-dark"
              style={{ fontFamily: 'var(--font-fredoka)' }}
            >
              plantrot
            </h1>
            <p className="mb-8 text-lg md:text-xl text-soil max-w-xl mx-auto">
              never forget to water your plants again. track care schedules, set reminders,
              and keep all your houseplants thriving.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center mb-8">
              <a
                href="/sign-up"
                className="rounded-lg bg-moss px-8 py-4 font-semibold text-cream transition-all hover:bg-moss-light hover:shadow-lg transform hover:scale-105"
              >
                Get Started
              </a>
              <a
                href="/sign-in"
                className="rounded-lg border-2 border-sage bg-card-bg px-8 py-4 font-semibold text-moss transition-all hover:border-moss hover:bg-sage/10 hover:shadow-lg"
              >
                Sign In
              </a>
              <button
                onClick={() => setShowDemoModal(true)}
                className="rounded-lg border-2 border-terracotta bg-terracotta/10 px-8 py-4 font-semibold text-terracotta transition-all hover:border-terracotta hover:bg-terracotta/20 hover:shadow-lg"
              >
                👨‍💻 View Demo
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-12 bg-card-bg/80 backdrop-blur-sm rounded-xl border-2 border-sage p-6 shadow-lg">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="features" className="border-none">
                <AccordionTrigger className="text-xl font-semibold text-moss-dark hover:text-moss hover:no-underline">
                  🪴 What can plantrot do?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 mt-4">
                    {features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex gap-4 p-4 rounded-lg bg-cream/50 border border-sage/30 transition-all hover:border-moss/50 hover:shadow-md"
                      >
                        <div className="text-3xl flex-shrink-0">{feature.icon}</div>
                        <div>
                          <h3 className="font-semibold text-moss-dark mb-1">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-soil">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      <DemoLoginModal
        isOpen={showDemoModal}
        onClose={() => setShowDemoModal(false)}
      />
    </>
  );
}
