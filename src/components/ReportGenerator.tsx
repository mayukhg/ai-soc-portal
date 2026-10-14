import React, { useEffect, useState } from 'react';
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
import { trackHotjarEvent } from '@/lib/hotjar';

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
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);

  useEffect(() => {
    trackHotjarEvent('report_viewed');
  }, []);

  useEffect(() => {
    supabase
      .from('reports')
      .select('*')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const templates: ReportTemplate[] = [];
        const scheduled: ScheduledReport[] = [];
        data.forEach((row) => {
          const content = (row.content || {}) as {
            kind?: string;
            description?: string;
            role?: 'tier3' | 'management';
            sections?: string[];
            frequency?: string;
            template?: string;
          };
          if (content.kind === 'template' && (content.role === 'tier3' || content.role === 'management')) {
            templates.push({
              id: row.template_id || row.id,
              name: row.title,
              description: content.description || '',
              role: content.role,
              sections: content.sections || [],
              frequency: content.frequency || 'Ad hoc',
              lastGenerated: new Date(row.updated_at).toLocaleString(),
              status: row.status === 'draft' ? 'draft' : row.status === 'generating' ? 'scheduled' : 'active',
            });
          }
          if (content.kind === 'schedule') {
            scheduled.push({
              id: row.id,
              template: content.template || row.title,
              frequency: content.frequency || row.recurrence_pattern || 'Ad hoc',
              nextRun: row.scheduled_for ? new Date(row.scheduled_for).toLocaleString() : 'Not scheduled',
              recipients: row.generated_for || [],
              status: row.status === 'draft' ? 'paused' : 'active',
            });
          }
        });
        setReportTemplates(templates);
        setScheduledReports(scheduled);
      });
  }, []);

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
  const sectionChoices = filteredTemplates
    .flatMap((template) => template.sections)
    .filter((section, index, all) => all.indexOf(section) === index);

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
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed" data-hj-suppress="">
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

          {filteredTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">No report templates are loaded yet.</p>
          )}
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
                    {sectionChoices.map((section) => (
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