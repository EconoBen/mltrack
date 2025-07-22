"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const solutions = [
  {
    before: "mlflow ui",
    after: "ml ui",
    description: "Beautiful, modern interface that actually helps you work",
  },
  {
    before: "Complex Docker setup + API code + Cloud config",
    after: "ml ship model --modal",
    description: "One command to deploy anywhere",
  },
  {
    before: "MLproject files + conda.yaml + setup.py",
    after: "ml train script.py",
    description: "Just run your script, we handle the rest",
  },
  {
    before: "Write test client + Handle auth + Parse responses",
    after: "ml try model --modal",
    description: "Test deployed models instantly",
  },
];

export function SolutionSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-transparent to-purple-900/10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            MLTrack makes it{" "}
            <span className="text-purple-500">delightfully simple</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Keep using MLflow. Add MLTrack. Ship models in minutes.
          </p>
        </motion.div>
        
        <div className="space-y-6">
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white/5 border border-white/10 rounded-lg p-6 hover:border-purple-500/40 transition-colors"
            >
              <div className="grid md:grid-cols-2 gap-6 items-center">
                <div>
                  <div className="text-sm text-red-400 mb-2">Before MLTrack:</div>
                  <code className="text-sm text-gray-500 line-through font-mono">
                    {solution.before}
                  </code>
                </div>
                <div>
                  <div className="text-sm text-green-400 mb-2">With MLTrack:</div>
                  <code className="text-lg text-white font-mono bg-black/50 px-3 py-2 rounded inline-block">
                    {solution.after}
                  </code>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-gray-400">{solution.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-lg text-gray-400 mb-6">
            100% compatible with your existing MLflow setup
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              No migrations
            </div>
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              No breaking changes
            </div>
            <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              Just enhancement
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}