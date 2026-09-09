'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, MessageSquare, Zap, TrendingUp, Shield, Globe } from 'lucide-react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const features = [
    {
      icon: BarChart3,
      title: 'Real-time Inventory',
      description: 'Track product stock levels in real-time with instant alerts for low inventory.'
    },
    {
      icon: MessageSquare,
      title: 'AI Chatbot Support',
      description: 'Get instant answers to business questions with our intelligent AI assistant.'
    },
    {
      icon: Zap,
      title: 'Smart Analytics',
      description: 'Make data-driven decisions with comprehensive sales and inventory reports.'
    },
    {
      icon: TrendingUp,
      title: 'Sales Tracking',
      description: 'Monitor sales performance and identify trends to grow your business.'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security to protect your business data.'
    },
    {
      icon: Globe,
      title: 'Built for Nigeria',
      description: 'Designed specifically for Nigerian SMEs with local payment support.'
    },
  ];

  const stats = [
    { label: 'Active Businesses', value: '5,000+' },
    { label: 'Products Tracked', value: '1M+' },
    { label: 'Transactions Daily', value: '100K+' },
    { label: 'Customer Satisfaction', value: '98%' },
  ];

  const testimonials = [
    {
      name: 'Chioma Okafor',
      business: 'Elegant Fashion Store, Lagos',
      text: 'Ease has transformed how I manage my inventory. I can now track stock from anywhere and the AI chatbot helps me with quick business decisions.'
    },
    {
      name: 'Emeka Nwosu',
      business: 'Tech Supplies, Abuja',
      text: 'The real-time inventory alerts have helped me reduce stockouts. My customers are always happy because I never run out of stock.'
    },
    {
      name: 'Folake Adeyemi',
      business: 'Beauty Essentials, Ibadan',
      text: 'Simple, powerful, and affordable. Ease is exactly what a small business like mine needs to scale up efficiently.'
    },
  ];

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50 to-red-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Smart Inventory Management for <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Nigerian SMEs</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Ease for Business combines powerful inventory management with AI-powered business insights. Built specifically for the Nigerian entrepreneur who wants to scale smartly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center bg-gradient-to-r from-orange-600 to-red-600 text-white px-8 py-4 rounded-lg font-bold hover:shadow-lg transition-all hover:scale-105"
              >
                Get Started Free <ArrowRight className="ml-2" size={20} />
              </Link>
              <button className="inline-flex items-center justify-center border-2 border-orange-600 text-orange-600 px-8 py-4 rounded-lg font-bold hover:bg-orange-50 transition-colors">
                Watch Demo
              </button>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 size={80} className="mx-auto text-orange-600 mb-4" />
                <p className="text-gray-700 font-semibold">Dashboard Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                  {stat.value}
                </p>
                <p className="text-gray-600 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Powerful Features Built for You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="bg-white rounded-lg shadow p-8 hover:shadow-lg transition-shadow">
                  <Icon size={40} className="text-orange-600 mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            What Nigerian Entrepreneurs Say
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg shadow p-8">
                <p className="text-gray-700 mb-4 italic">&quot;{testimonial.text}&quot;</p>
                <p className="font-bold text-gray-900">{testimonial.name}</p>
                <p className="text-sm text-gray-600">{testimonial.business}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Starter', price: '₦5,000', features: ['Up to 100 products', 'Basic analytics', 'Email support'] },
              { name: 'Professional', price: '₦15,000', features: ['Up to 1,000 products', 'Advanced analytics', 'AI Chatbot', 'Priority support'], highlight: true },
              { name: 'Enterprise', price: 'Custom', features: ['Unlimited products', 'Custom integrations', 'Dedicated support', 'Advanced security'] },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg p-8 transition-all ${
                  plan.highlight
                    ? 'bg-gradient-to-br from-orange-600 to-red-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-900 shadow'
                }`}
              >
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className={`text-3xl font-bold mb-6 ${plan.highlight ? 'text-white' : 'text-orange-600'}`}>
                  {plan.price}
                </p>
                <p className="text-sm opacity-90 mb-6">/month</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${plan.highlight ? 'bg-white' : 'bg-orange-600'}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full py-2 rounded font-bold transition-all ${
                    plan.highlight
                      ? 'bg-white text-orange-600 hover:bg-gray-100'
                      : 'border border-orange-600 text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg mb-8 opacity-90">
            Join thousands of Nigerian entrepreneurs using Ease for Business to manage their inventory and grow their business.
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 px-4 py-3 rounded text-gray-900 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="bg-white text-orange-600 px-6 py-3 rounded font-bold hover:bg-gray-100 transition-colors"
            >
              Get Started
            </button>
          </form>
          {subscribed && (
            <p className="text-green-200 mt-4">Thanks! Check your email for next steps.</p>
          )}
        </div>
      </section>
    </>
  );
}
