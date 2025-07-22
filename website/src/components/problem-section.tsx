"use client";

import { motion } from "framer-motion";
import { AlertCircle, Clock, Code, Zap } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Weeks to deploy",
    description: "Traditional ML deployment involves containers, APIs, infrastructure setup, and endless configuration.",
  },
  {
    icon: AlertCircle,
    title: "MLflow's dated UI",
    description: "MLflow's interface feels like 2015. Finding experiments, comparing models, and tracking costs is painful.",
  },
  {
    icon: Code,
    title: "Complex workflows",
    description: "Jumping between notebooks, MLflow UI, cloud consoles, and deployment scripts breaks your flow.",
  },
  {
    icon: Zap,
    title: "No quick testing",
    description: "Want to test a model? Set up an API, write client code, handle authentication... hours later.",
  },
];

export function ProblemSection() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            ML deployment is{" "}
            <span className="text-red-500">unnecessarily hard</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            You trained a great model. Now you need a PhD in DevOps to share it with the world.
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-red-500/5 border border-red-500/20 rounded-lg p-6 hover:border-red-500/40 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <problem.icon className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{problem.title}</h3>
                  <p className="text-gray-300">{problem.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}