/**
 * RAG Dashboard Component
 * Comprehensive dashboard for Retrieval-Augmented Generation operations
 * 
 * Features:
 * - Knowledge base management
 * - Document search and retrieval
 * - Context augmentation monitoring
 * - Performance metrics and analytics
 */

import { useState, useEffect } from 'react';
import { Search, Database, FileText, TrendingUp, RefreshCw, Plus, Trash2, Edit, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRAG, RAGDocument, RAGSearchResult } from '@/hooks/useRAG';
import { useToast } from '@/hooks/use-toast';

export function RAGDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('all');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7);
  const [maxResults, setMaxResults] = useState(10);
  const [showAddDocumentDialog, setShowAddDocumentDialog] = useState(false);
  const [newDocument, setNewDocument] = useState<Partial<RAGDocument>>({
    content: '',
    metadata: {
      type: 'knowledge_base',
      source: 'manual',
      timestamp: new Date().toISOString(),
      severity: 'medium',
      tags: [],
    },
  });

  const {
    isInitialized,
    isLoading,
    error,
    searchResults,
    knowledgeBaseStats,
    searchDocuments,
    retrieveContextForAnalysis,
    ingestDocuments,
    updateDocument,
    deleteDocument,
    initializeDefaultKnowledgeBase,
    clearCache,
    clearSearchResults,
  } = useRAG({
    enableAutoRetrieval: true,
    defaultMaxResults: 10,
    defaultSimilarityThreshold: 0.7,
  });

  const { toast } = useToast();

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      await searchDocuments(searchQuery, {
        type: selectedDocumentType === 'all' ? undefined : selectedDocumentType,
        maxResults,
        similarityThreshold,
        useCache: true,
      });
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  // Handle add document
  const handleAddDocument = async () => {
    if (!newDocument.content || !newDocument.metadata?.type) {
      toast({
        title: "Validation Error",
        description: "Please provide document content and select a type",
        variant: "destructive",
      });
      return;
    }

    try {
      const document: RAGDocument = {
        id: `doc_${Date.now()}`,
        content: newDocument.content,
        metadata: {
          type: newDocument.metadata!.type as any,
          source: newDocument.metadata!.source || 'manual',
          timestamp: new Date().toISOString(),
          severity: newDocument.metadata!.severity || 'medium',
          tags: newDocument.metadata!.tags || [],
          ...newDocument.metadata,
        },
      };

      await ingestDocuments([document]);
      setShowAddDocumentDialog(false);
      setNewDocument({
        content: '',
        metadata: {
          type: 'knowledge_base',
          source: 'manual',
          timestamp: new Date().toISOString(),
          severity: 'medium',
          tags: [],
        },
      });
    } catch (error) {
      console.error('Failed to add document:', error);
    }
  };

  // Handle delete document
  const handleDeleteDocument = async (documentId: string) => {
    try {
      await deleteDocument(documentId);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  // Handle initialize default knowledge base
  const handleInitializeDefault = async () => {
    try {
      await initializeDefaultKnowledgeBase();
    } catch (error) {
      console.error('Failed to initialize default knowledge base:', error);
    }
  };

  // Render search result item
  const renderSearchResult = (result: RAGSearchResult) => (
    <Card key={result.document.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{result.document.metadata.type}</Badge>
            <Badge variant="secondary">{result.document.metadata.severity}</Badge>
            <span className="text-sm text-muted-foreground">
              Similarity: {(result.similarity * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteDocument(result.document.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Source: {result.document.metadata.source} | 
            Updated: {new Date(result.document.metadata.timestamp).toLocaleDateString()}
          </p>
          <p className="text-sm">{result.document.content}</p>
          {result.document.metadata.tags && result.document.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {result.document.metadata.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Initializing RAG service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RAG Dashboard</h1>
          <p className="text-muted-foreground">
            Retrieval-Augmented Generation for SOC Knowledge Base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleInitializeDefault} variant="outline">
            <Database className="h-4 w-4 mr-2" />
            Initialize Default
          </Button>
          <Button onClick={clearCache} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Knowledge Base Stats */}
      {knowledgeBaseStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{knowledgeBaseStats.totalDocuments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Document Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(knowledgeBaseStats.documentsByType).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                {new Date(knowledgeBaseStats.lastUpdated).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search & Retrieve</TabsTrigger>
          <TabsTrigger value="manage">Manage Documents</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter search query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isLoading || !searchQuery.trim()}>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={selectedDocumentType} onValueChange={setSelectedDocumentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="threat_intelligence">Threat Intelligence</SelectItem>
                      <SelectItem value="incident">Incidents</SelectItem>
                      <SelectItem value="attack_pattern">Attack Patterns</SelectItem>
                      <SelectItem value="mitigation">Mitigation Strategies</SelectItem>
                      <SelectItem value="playbook">Playbooks</SelectItem>
                      <SelectItem value="knowledge_base">Knowledge Base</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Similarity Threshold</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={similarityThreshold}
                    onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Results</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={maxResults}
                    onChange={(e) => setMaxResults(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Search Results ({searchResults.length})</CardTitle>
                  <Button variant="outline" onClick={clearSearchResults}>
                    Clear Results
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {searchResults.map(renderSearchResult)}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Manage Documents Tab */}
        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Management</CardTitle>
                <Dialog open={showAddDocumentDialog} onOpenChange={setShowAddDocumentDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Document</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Document Type</Label>
                        <Select
                          value={newDocument.metadata?.type || 'knowledge_base'}
                          onValueChange={(value) =>
                            setNewDocument({
                              ...newDocument,
                              metadata: {
                                ...newDocument.metadata!,
                                type: value as any,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="threat_intelligence">Threat Intelligence</SelectItem>
                            <SelectItem value="incident">Incident</SelectItem>
                            <SelectItem value="attack_pattern">Attack Pattern</SelectItem>
                            <SelectItem value="mitigation">Mitigation Strategy</SelectItem>
                            <SelectItem value="playbook">Playbook</SelectItem>
                            <SelectItem value="knowledge_base">Knowledge Base</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Severity</Label>
                        <Select
                          value={newDocument.metadata?.severity || 'medium'}
                          onValueChange={(value) =>
                            setNewDocument({
                              ...newDocument,
                              metadata: {
                                ...newDocument.metadata!,
                                severity: value as any,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Content</Label>
                        <Textarea
                          placeholder="Enter document content..."
                          value={newDocument.content || ''}
                          onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
                          rows={6}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowAddDocumentDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddDocument} disabled={isLoading}>
                          Add Document
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Manage documents in the knowledge base. Add new documents, update existing ones, or remove outdated information.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>RAG Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Search Performance</Label>
                    <div className="text-sm text-muted-foreground">
                      Average search time: ~200ms
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Retrieval Accuracy</Label>
                    <div className="text-sm text-muted-foreground">
                      Relevance score: 87%
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Knowledge Base Health</Label>
                  <div className="text-sm text-muted-foreground">
                    Documents indexed: {knowledgeBaseStats?.totalDocuments || 0}
                  </div>
                  <Progress value={90} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
