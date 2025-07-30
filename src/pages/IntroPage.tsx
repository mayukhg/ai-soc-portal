import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Brain, Users, AlertTriangle, BarChart3, Map, FileText, Zap } from 'lucide-react';

const IntroPage = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const features = [
    {
      icon: AlertTriangle,
      title: "Real-time Alert Monitoring",
      description: "Monitor and manage security alerts across your infrastructure with intelligent prioritization and automated correlation.",
      badge: "Core Feature"
    },
    {
      icon: Brain,
      title: "AI-Powered Analysis",
      description: "Leverage advanced AI to analyze threats, provide contextual insights, and assist in incident response decisions.",
      badge: "AI Enhanced"
    },
    {
      icon: Shield,
      title: "Incident Management",
      description: "Streamlined workflow for tracking, investigating, and resolving security incidents with full audit trails.",
      badge: "Workflow"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Coordinate response efforts with team communication tools, shared playbooks, and real-time updates.",
      badge: "Collaboration"
    },
    {
      icon: BarChart3,
      title: "KPI Metrics & Analytics",
      description: "Track security posture with comprehensive metrics, trend analysis, and executive dashboards.",
      badge: "Analytics"
    },
    {
      icon: Map,
      title: "Threat Intelligence Map",
      description: "Visualize threat landscape with geographic attack patterns and threat actor intelligence.",
      badge: "Intelligence"
    },
    {
      icon: FileText,
      title: "Automated Reporting",
      description: "Generate comprehensive security reports for compliance, executive briefings, and operational reviews.",
      badge: "Automation"
    }
  ];

  const slides = [
    {
      title: "Welcome to SOC AI Portal",
      subtitle: "Your Intelligent Security Operations Center",
      content: (
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
            <Shield className="w-12 h-12 text-primary-foreground" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            An advanced Security Operations Center platform that combines human expertise with artificial intelligence 
            to detect, analyze, and respond to cybersecurity threats in real-time.
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">AI-Powered</Badge>
            <Badge variant="secondary">Real-time</Badge>
            <Badge variant="secondary">Collaborative</Badge>
          </div>
        </div>
      )
    },
    {
      title: "Comprehensive Security Suite",
      subtitle: "Everything you need for modern threat detection and response",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 hover:border-primary/20 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <feature.icon className="w-8 h-8 text-primary" />
                  <Badge variant="outline" className="text-xs">{feature.badge}</Badge>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    },
    {
      title: "Ready to Get Started?",
      subtitle: "Join thousands of security professionals protecting their organizations",
      content: (
        <div className="text-center space-y-8">
          <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-semibold">Quick Setup</h4>
              <p className="text-sm text-muted-foreground">Get started in minutes</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-semibold">AI Insights</h4>
              <p className="text-sm text-muted-foreground">Intelligent threat analysis</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-semibold">Team Ready</h4>
              <p className="text-sm text-muted-foreground">Built for collaboration</p>
            </div>
          </div>
          <div className="bg-card border rounded-lg p-6 max-w-lg mx-auto">
            <h4 className="font-semibold mb-2">What's Next?</h4>
            <p className="text-sm text-muted-foreground mb-4">
              You'll be taken to your dashboard where you can start monitoring alerts, 
              analyzing threats, and collaborating with your security team.
            </p>
            <Button onClick={() => navigate('/')} className="w-full" size="lg">
              Enter Dashboard
            </Button>
          </div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-2xl font-bold">SOC AI Portal</h1>
            </div>
            
            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mb-8">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="bg-card border rounded-xl shadow-lg p-8 min-h-[600px] flex flex-col">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">{slides[currentSlide].title}</h2>
              <p className="text-xl text-muted-foreground">{slides[currentSlide].subtitle}</p>
            </div>

            <div className="flex-1 flex items-center justify-center">
              {slides[currentSlide].content}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              <Button
                variant="outline"
                onClick={prevSlide}
                disabled={currentSlide === 0}
              >
                Previous
              </Button>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/')}>
                  Skip Intro
                </Button>
                {currentSlide < slides.length - 1 ? (
                  <Button onClick={nextSlide}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/')} className="bg-primary">
                    Get Started
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroPage;