"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Command {
  input?: string;
  output?: string;
  delay?: number;
}

const commands: Command[] = [
  { input: "ml train model.py", delay: 500 },
  { output: "🚀 Starting training run...", delay: 300 },
  { output: "📊 Tracking metrics to MLTrack UI...", delay: 400 },
  { output: "✅ Training complete! Model accuracy: 0.94", delay: 600 },
  { input: "ml save awesome-model", delay: 800 },
  { output: "💾 Model saved to registry", delay: 300 },
  { input: "ml ship awesome-model --modal", delay: 1000 },
  { output: "🚢 Deploying to Modal...", delay: 400 },
  { output: "🎯 API endpoint ready at:", delay: 300 },
  { output: "   https://your-model.modal.run/predict", delay: 200 },
  { output: "✨ Deployment complete in 47 seconds!", delay: 500 },
];

export function AnimatedTerminal() {
  const [displayedCommands, setDisplayedCommands] = useState<Command[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    if (currentIndex >= commands.length) {
      // Reset after a delay
      const resetTimer = setTimeout(() => {
        setDisplayedCommands([]);
        setCurrentIndex(0);
        setCurrentText("");
      }, 3000);
      return () => clearTimeout(resetTimer);
    }

    const currentCommand = commands[currentIndex];
    const text = currentCommand.input || currentCommand.output || "";
    const delay = currentCommand.delay || 0;

    // Wait before starting to type
    const startTimer = setTimeout(() => {
      setIsTyping(true);
      let charIndex = 0;

      const typeTimer = setInterval(() => {
        if (charIndex <= text.length) {
          setCurrentText(text.slice(0, charIndex));
          charIndex++;
        } else {
          clearInterval(typeTimer);
          setIsTyping(false);
          setDisplayedCommands((prev) => [...prev, { ...currentCommand, input: currentCommand.input ? text : undefined, output: currentCommand.output ? text : undefined }]);
          setCurrentText("");
          setCurrentIndex((prev) => prev + 1);
        }
      }, currentCommand.input ? 60 : 20); // Type commands slower

      return () => clearInterval(typeTimer);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [currentIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="bg-[#0a0a0a] rounded-lg border border-[#262626] shadow-2xl shadow-purple-500/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1a1a1a] border-b border-[#262626]">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1 text-center text-sm text-[#737373] font-mono">
            mltrack-demo
          </div>
        </div>
        <div className="p-4 font-mono text-sm min-h-[400px]">
          <div className="space-y-2">
            {displayedCommands.map((cmd, index) => (
              <div key={index}>
                {cmd.input && (
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">$</span>
                    <span className="text-white">{cmd.input}</span>
                  </div>
                )}
                {cmd.output && (
                  <div className="text-[#d3d3d3] pl-4">{cmd.output}</div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2">
                {commands[currentIndex]?.input ? (
                  <>
                    <span className="text-green-500">$</span>
                    <span className="text-white">{currentText}</span>
                  </>
                ) : (
                  <div className="text-[#d3d3d3] pl-4">{currentText}</div>
                )}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}