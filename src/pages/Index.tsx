import { Navbar } from "@/components/Navbar";
import { ConnectionForm } from "@/components/ConnectionForm";
import { Dashboard } from "@/components/Dashboard";
import { useRepository } from "@/contexts/RepositoryContext";
import { GitBranchPlus, GitMerge, Workflow, GitPullRequestIcon, Sparkles, GitFork, Code, GitCommitIcon, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const featureItems = [
  {
    icon: <GitBranchPlus className="h-10 w-10 text-primary mb-3" />,
    title: "Branch Management",
    description: "Track feature, bugfix, and hotfix branches with intuitive visual indicators"
  },
  {
    icon: <GitMerge className="h-10 w-10 text-primary mb-3" />,
    title: "Merge Status",
    description: "See at a glance which branches have been merged to development, quality, and production"
  },
  {
    icon: <GitPullRequestIcon className="h-10 w-10 text-primary mb-3" />,
    title: "Pull Requests",
    description: "Create pull requests and perform cleanup operations on multiple branches at once"
  },
  {
    icon: <GitCommitIcon className="h-10 w-10 text-primary mb-3" />,
    title: "Commit Analytics",
    description: "View detailed commit history and contributor analytics"
  },
];

const Index = () => {
  const { repository } = useRepository();
  const { theme } = useTheme();
  const connectionFormRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Navigate to repository page when connected
  useEffect(() => {
    if (repository?.isConnected) {
      navigate(`/${repository.owner}/${repository.name}`);
    }
  }, [repository?.isConnected, repository?.owner, repository?.name, navigate]);

  // Scroll to top when repository is connected
  useEffect(() => {
    if (repository?.isConnected) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [repository?.isConnected]);

  const scrollToConnectionForm = () => {
    if (connectionFormRef.current) {
      connectionFormRef.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-slate-800' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} bg-fixed`}>
      <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
      <Navbar />
      <main className="flex-1 container py-6">
        {!repository?.isConnected ? (
          <div className="py-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-center mb-12"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 mb-6"
              >
                <motion.div
                  initial={{ rotate: -15 }}
                  animate={{ rotate: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <GitBranchPlus className="h-14 w-14 text-primary" />
                </motion.div>
                <motion.div className="relative">
                  <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/80 to-primary/60 animate-gradient-x bg-[length:200%_auto]">
                    GitExtender
                  </h1>
                  <motion.span 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                    className="absolute -bottom-1 left-0 h-[3px] bg-gradient-to-r from-primary to-transparent rounded-full"
                  />
                </motion.div>
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-center text-muted-foreground max-w-2xl mx-auto text-xl"
              >
                Advanced Git branch management and workflow automation.
                <span className="block mt-3 text-lg">
                  Take control of your repositories with powerful branch analytics and management tools.
                </span>
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-8 flex justify-center gap-4"
              >
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  onClick={scrollToConnectionForm}
                >
                  <GitPullRequestIcon className="mr-2 h-5 w-5" />
                  Connect Now
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-primary/20 hover:border-primary/40 transition-all"
                  onClick={() => window.open('https://github.com', '_blank')}
                >
                  <Share2 className="mr-2 h-5 w-5" />
                  Learn More
                </Button>
              </motion.div>
            </motion.div>
            
            <motion.div 
              className="mb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {featureItems.map((feature, index) => (
                <motion.div 
                  key={index}
                  variants={item}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-md shadow-lg border border-border/50 p-6 flex flex-col items-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5 + (index * 0.2), duration: 0.5, type: "spring" }}
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    className="relative z-10"
                  >
                    {feature.icon}
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2 relative z-10">{feature.title}</h3>
                  <p className="text-muted-foreground relative z-10">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>
            
            <motion.div
              ref={connectionFormRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-radial from-primary/5 to-transparent -z-10 blur-2xl" />
              <ConnectionForm />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.8 }}
                className="absolute -top-12 -right-12 md:right-0 text-primary/10 dark:text-primary/5 -z-10"
              >
                <Sparkles className="w-32 h-32" />
              </motion.div>
            </motion.div>
            
            <motion.div 
              className="mt-20 text-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              <h2 className="text-2xl font-bold mb-4">Why Choose GitExtender?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="flex flex-col items-center p-4">
                  <div className="p-3 rounded-full bg-primary/10 mb-3">
                    <Code className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Open Source</h3>
                  <p className="text-muted-foreground text-sm">Built for developers by developers, with modern tools</p>
                </div>
                
                <div className="flex flex-col items-center p-4">
                  <div className="p-3 rounded-full bg-primary/10 mb-3">
                    <GitFork className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Multi-Repository</h3>
                  <p className="text-muted-foreground text-sm">Manage branches across multiple repositories efficiently</p>
                </div>
                
                <div className="flex flex-col items-center p-4">
                  <div className="p-3 rounded-full bg-primary/10 mb-3">
                    <Workflow className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Workflow Integration</h3>
                  <p className="text-muted-foreground text-sm">Seamlessly integrates with popular CI/CD pipelines</p>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <Dashboard />
        )}
      </main>
      <motion.footer 
        className="border-t py-6 bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
      >
        <div className="container text-center">
          <p className="text-muted-foreground mb-2">GitExtender • Advanced Branch Management Dashboard</p>
          <div className="flex justify-center gap-4 text-sm">
            <a href="#" className="text-primary hover:underline">Documentation</a>
            <a href="#" className="text-primary hover:underline">GitHub</a>
            <a href="#" className="text-primary hover:underline">Support</a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default Index;
