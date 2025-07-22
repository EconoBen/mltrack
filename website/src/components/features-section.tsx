"use client";

import { motion } from "framer-motion";
import { 
  Zap, 
  Palette, 
  Globe, 
  Terminal, 
  DollarSign, 
  Users,
  Shield,
  Gauge
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "One-command deployment",
    description: "ml ship model --modal deploys to production. No Dockerfile, no YAML, no tears.",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: Palette,
    title: "Beautiful modern UI",
    description: "Finally, an ML dashboard that doesn't look like it's from 2015. Dark mode included.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Globe,
    title: "Deploy anywhere",
    description: "Modal, AWS Lambda, or Docker. More platforms coming soon. Your models, your choice.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Terminal,
    title: "CLI that sparks joy",
    description: "Intuitive commands that make sense. ml train, ml save, ml ship. That's it.",
    gradient: "from-green-500 to-teal-500",
  },
  {
    icon: DollarSign,
    title: "Cost tracking built-in",
    description: "See exactly how much each model costs to train and deploy. No surprises.",
    gradient: "from-red-500 to-pink-500",
  },
  {
    icon: Users,
    title: "Team-friendly",
    description: "Share models, track experiments, and collaborate without the complexity.",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    icon: Shield,
    title: "MLflow compatible",
    description: "Works with your existing MLflow setup. No migrations, no data loss, just enhancement.",
    gradient: "from-gray-500 to-gray-700",
  },
  {
    icon: Gauge,
    title: "Lightning fast",
    description: "Modern tech stack means instant loads, real-time updates, and zero lag.",
    gradient: "from-orange-500 to-red-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything you need to{" "}
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              ship ML models
            </span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Built by ML engineers who got tired of the deployment dance.
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="group relative bg-white/5 border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity rounded-lg"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
                  "--tw-gradient-from": feature.gradient.split(" ")[1],
                  "--tw-gradient-to": feature.gradient.split(" ")[3],
                } as React.CSSProperties}
              />
              
              <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.gradient} mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-300 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}