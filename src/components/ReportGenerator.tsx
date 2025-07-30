import React, { useState } from 'react';
import { FileText, Download, Calendar, Settings, TrendingUp, Users, Shield, Clock, Filter, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  role: 'tier3' | 'management';
  sections: string[];
  frequency: string;
  lastGenerated: string;
  status: 'active' | 'draft' | 'scheduled';
}

interface ScheduledReport {
  id: string;
  template: string;
  frequency: string;
  nextRun: string;
  recipients: string[];
  status: 'active' | 'paused';
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'tier3-incident-analysis',
    name: 'Incident Analysis Report',
    description: 'Detailed technical analysis of security incidents for Tier 3 analysts',
    role: 'tier3',
    sections: ['Incident Timeline', 'IOCs', 'Attack Vectors', 'Mitigation Steps', 'Lessons Learned'],
    frequency: 'Weekly',
    lastGenerated: '2024-01-28 09:30',
    status: 'active'
  },
  {
    id: 'tier3-threat-intel',
    name: 'Threat Intelligence Summary',
    description: 'Comprehensive threat landscape analysis with technical details',
    role: 'tier3',
    sections: ['New Threats', 'TTPs Analysis', 'Vulnerability Assessment', 'Recommendations'],
    frequency: 'Daily',
    lastGenerated: '2024-01-28 14:15',
    status: 'active'
  },
  {
    id: 'mgmt-executive-summary',
    name: 'Executive Security Summary',
    description: 'High-level security posture overview for management',
    role: 'management',
    sections: ['Security Metrics', 'Risk Assessment', 'Budget Impact', 'Strategic Recommendations'],
    frequency: 'Monthly',
    lastGenerated: '2024-01-25 16:00',
    status: 'active'
  },
  {
    id: 'mgmt-kpi-dashboard',
    name: 'SOC Performance Dashboard',
    description: 'KPI metrics and operational efficiency for management review',
    role: 'management',
    sections: ['MTTD/MTTR Trends', 'Team Performance', 'False Positive Rates', 'Escalation Analysis'],
    frequency: 'Weekly',
    lastGenerated: '2024-01-28 08:00',
    status: 'active'
  }
];

const scheduledReports: ScheduledReport[] = [
  {
    id: 'sched-1',
    template: 'Executive Security Summary',
    frequency: 'Monthly',
    nextRun: '2024-02-01 09:00',
    recipients: ['ciso@company.com', 'security-leads@company.com'],
    status: 'active'
  },
  {
    id: 'sched-2',
    template: 'SOC Performance Dashboard',
    frequency: 'Weekly',
    nextRun: '2024-01-29 08:00',
    recipients: ['soc-manager@company.com', 'security-team@company.com'],
    status: 'active'
  }
];

export function ReportGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<'tier3' | 'management'>('management');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customSections, setCustomSections] = useState<string[]>([]);
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const getRoleColor = (role: string) => {
    return role === 'tier3' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-accent/10 text-accent border-accent/20';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'scheduled': return 'bg-warning/10 text-warning border-warning/20';
      case 'draft': return 'bg-muted text-muted-foreground border-muted-foreground/20';
      default: return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  const handleGenerateReport = async (templateId?: string, reportType?: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate reports.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setGeneratedReport(null);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const requestBody = {
        reportType: reportType || (templateId ? getReportTypeFromTemplate(templateId) : 'custom'),
        templateId: templateId,
        customSections: customSections,
        title: reportTitle || 'Generated Report',
        description: reportDescription,
        generatedBy: user.id,
        generatedFor: selectedRole === 'management' ? ['management'] : ['analyst_tier3'],
        timeRange: '7d'
      };

      console.log('Generating report with:', requestBody);

      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: requestBody
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) {
        console.error('Report generation error:', error);
        throw error;
      }

      if (data?.success) {
        setGeneratedReport(data.content);
        toast({
          title: "Report Generated Successfully",
          description: `Report created with ${data.summary?.incidents || 0} incidents and ${data.summary?.alerts || 0} alerts analyzed.`,
        });
      } else {
        throw new Error(data?.error || 'Failed to generate report');
      }
    } catch (err: any) {
      console.error('Report generation failed:', err);
      toast({
        title: "Report Generation Failed",
        description: err.message || "An error occurred while generating the report.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const getReportTypeFromTemplate = (templateId: string): string => {
    if (templateId.includes('executive')) return 'executive_summary';
    if (templateId.includes('incident')) return 'incident_summary';
    if (templateId.includes('threat')) return 'threat_analysis';
    if (templateId.includes('kpi') || templateId.includes('performance')) return 'performance_metrics';
    return 'custom';
  };

  const filteredTemplates = reportTemplates.filter(template => template.role === selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Report Generator</h2>
          <p className="text-muted-foreground">Automated, role-based security reports</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="animate-pulse-glow">
            <Clock className="h-3 w-3 mr-1" />
            Auto-Generated
          </Badge>
          <Button onClick={() => handleGenerateReport()} disabled={generating}>
            <FileText className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {generating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Generating Report...</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                This may take a few moments while we analyze your security data
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {generatedReport && (
        <Card className="border-success/20 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-success" />
              Generated Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {generatedReport}
              </pre>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button size="sm" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Share Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="generate">Generate Custom</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center gap-4">
            <Label>Filter by Role:</Label>
            <Select value={selectedRole} onValueChange={(value: 'tier3' | 'management') => setSelectedRole(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="management">Management</SelectItem>
                <SelectItem value="tier3">Tier 3 Analysts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map((template, index) => (
              <Card 
                key={template.id} 
                className="hover:shadow-md transition-all duration-200 animate-fade-in border-l-4 border-l-primary"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleColor(template.role)} variant="outline">
                        {template.role === 'tier3' ? 'Tier 3' : 'Management'}
                      </Badge>
                      <Badge className={getStatusColor(template.status)} variant="outline">
                        {template.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">SECTIONS INCLUDED</Label>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.sections.map((section) => (
                        <Badge key={section} variant="secondary" className="text-xs">
                          {section}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Frequency: {template.frequency}</span>
                    <span className="text-muted-foreground">Last: {template.lastGenerated}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => handleGenerateReport(template.id)}
                      disabled={generating}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      Generate
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Custom Report</CardTitle>
              <p className="text-sm text-muted-foreground">
                Build a customized report with specific sections and parameters
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="report-title">Report Title</Label>
                    <Input 
                      id="report-title"
                      placeholder="Enter report title"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="report-role">Target Role</Label>
                    <Select value={selectedRole} onValueChange={(value: 'tier3' | 'management') => setSelectedRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="tier3">Tier 3 Analysts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="report-description">Description</Label>
                    <Textarea 
                      id="report-description"
                      placeholder="Describe the purpose and scope of this report"
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Report Sections</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {selectedRole === 'management' ? [
                      'Executive Summary',
                      'Security Metrics Overview',
                      'Risk Assessment',
                      'Budget & Resource Analysis',
                      'Compliance Status',
                      'Strategic Recommendations',
                      'Incident Impact Analysis',
                      'Team Performance KPIs'
                    ] : [
                      'Technical Incident Analysis',
                      'IOC Details',
                      'Attack Vector Analysis',
                      'Malware Analysis',
                      'Network Forensics',
                      'Timeline Reconstruction',
                      'Mitigation Procedures',
                      'Threat Intelligence Correlation'
                    ].map((section) => (
                      <div key={section} className="flex items-center space-x-2">
                        <Checkbox 
                          id={section}
                          checked={customSections.includes(section)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCustomSections([...customSections, section]);
                            } else {
                              setCustomSections(customSections.filter(s => s !== section));
                            }
                          }}
                        />
                        <Label htmlFor={section} className="text-sm">{section}</Label>
                      </div>
                    ))}
                  </div>
                  
                  <Button className="w-full" onClick={() => handleGenerateReport()} disabled={!reportTitle || customSections.length === 0 || generating}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Custom Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Scheduled Reports</h3>
              <p className="text-sm text-muted-foreground">Manage automated report generation and distribution</p>
            </div>
            <Button>
              <Calendar className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scheduledReports.map((report, index) => (
              <Card 
                key={report.id}
                className="animate-fade-in hover:shadow-md transition-all duration-200"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.template}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {report.frequency} • Next: {report.nextRun}
                      </p>
                    </div>
                    <Badge className={report.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}>
                      {report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">RECIPIENTS</Label>
                    <div className="mt-2 space-y-1">
                      {report.recipients.map((recipient, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Send className="h-3 w-3 text-muted-foreground" />
                          {recipient}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      Edit Schedule
                    </Button>
                    <Button size="sm" variant="outline">
                      {report.status === 'active' ? 'Pause' : 'Resume'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}