import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Custom node styles
const nodeStyles = {
  ui: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: '2px solid #5a67d8',
    borderRadius: '12px',
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: 600,
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  api: {
    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: 'white',
    border: '2px solid #059669',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: 500,
    boxShadow: '0 4px 15px rgba(17, 153, 142, 0.3)',
  },
  service: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: '2px solid #ec4899',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: 500,
    boxShadow: '0 4px 15px rgba(245, 87, 108, 0.3)',
  },
  orchestrator: {
    background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    color: '#1a1a2e',
    border: '2px solid #f59e0b',
    borderRadius: '16px',
    padding: '14px 24px',
    fontSize: '14px',
    fontWeight: 700,
    boxShadow: '0 6px 20px rgba(250, 112, 154, 0.4)',
  },
  rag: {
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: 'white',
    border: '2px solid #0ea5e9',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: 500,
    boxShadow: '0 4px 15px rgba(79, 172, 254, 0.3)',
  },
  infra: {
    background: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
    color: 'white',
    border: '2px solid #374151',
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: 500,
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  group: {
    background: 'rgba(255,255,255,0.05)',
    border: '2px dashed #4b5563',
    borderRadius: '16px',
    padding: '20px',
  },
};

// Define all nodes
const initialNodes: Node[] = [
  // ========== UI LAYER (Top) ==========
  // Group label
  { id: 'ui-label', position: { x: 50, y: 20 }, data: { label: '🖥️ USER INTERFACE LAYER' }, type: 'default', style: { ...nodeStyles.group, width: 1400, height: 120, background: 'rgba(102, 126, 234, 0.1)' } },

  // UI Pages
  { id: 'studio', position: { x: 80, y: 60 }, data: { label: '🎨 Studio\n(/)' }, style: nodeStyles.ui },
  { id: 'products', position: { x: 220, y: 60 }, data: { label: '📦 ProductLibrary\n(/products)' }, style: nodeStyles.ui },
  { id: 'brand', position: { x: 390, y: 60 }, data: { label: '🏷️ BrandProfile\n(/brand)' }, style: nodeStyles.ui },
  { id: 'brand-images', position: { x: 550, y: 60 }, data: { label: '🖼️ BrandImages\n(/brand-images)' }, style: nodeStyles.ui },
  { id: 'templates', position: { x: 720, y: 60 }, data: { label: '📐 Templates\n(/templates)' }, style: nodeStyles.ui },
  { id: 'gallery', position: { x: 870, y: 60 }, data: { label: '🖼️ Gallery\n(/gallery)' }, style: nodeStyles.ui },
  { id: 'generation-detail', position: { x: 1010, y: 60 }, data: { label: '🔍 GenerationDetail\n(/generation/:id)' }, style: nodeStyles.ui },
  { id: 'login', position: { x: 1170, y: 60 }, data: { label: '🔐 Login\n(/login)' }, style: nodeStyles.ui },

  // ========== API LAYER (Second Row) ==========
  { id: 'api-label', position: { x: 50, y: 180 }, data: { label: '🔌 API ENDPOINTS LAYER' }, type: 'default', style: { ...nodeStyles.group, width: 1400, height: 180, background: 'rgba(17, 153, 142, 0.1)' } },

  // Auth endpoints
  { id: 'api-auth-me', position: { x: 80, y: 220 }, data: { label: 'GET /api/auth/me' }, style: nodeStyles.api },
  { id: 'api-auth-login', position: { x: 80, y: 270 }, data: { label: 'POST /api/auth/login' }, style: nodeStyles.api },
  { id: 'api-auth-logout', position: { x: 80, y: 320 }, data: { label: 'POST /api/auth/logout' }, style: nodeStyles.api },

  // Product endpoints
  { id: 'api-products', position: { x: 240, y: 220 }, data: { label: 'GET /api/products' }, style: nodeStyles.api },
  { id: 'api-products-post', position: { x: 240, y: 270 }, data: { label: 'POST /api/products' }, style: nodeStyles.api },
  { id: 'api-products-delete', position: { x: 240, y: 320 }, data: { label: 'DELETE /api/products/:id' }, style: nodeStyles.api },

  // Transform/Generation endpoints
  { id: 'api-transform', position: { x: 400, y: 220 }, data: { label: 'POST /api/transform' }, style: nodeStyles.api },
  { id: 'api-generations', position: { x: 400, y: 270 }, data: { label: 'GET /api/generations' }, style: nodeStyles.api },
  { id: 'api-generation-edit', position: { x: 400, y: 320 }, data: { label: 'POST /api/generations/:id/edit' }, style: nodeStyles.api },

  // Brand endpoints
  { id: 'api-brand-profile', position: { x: 570, y: 220 }, data: { label: 'GET/PUT /api/brand-profile' }, style: nodeStyles.api },
  { id: 'api-brand-images', position: { x: 570, y: 270 }, data: { label: 'GET/POST /api/brand-images' }, style: nodeStyles.api },
  { id: 'api-analyze-image', position: { x: 570, y: 320 }, data: { label: 'POST /api/analyze-image' }, style: nodeStyles.api },

  // Copy & Templates
  { id: 'api-copy-generate', position: { x: 740, y: 220 }, data: { label: 'POST /api/copy/generate' }, style: nodeStyles.api },
  { id: 'api-templates', position: { x: 740, y: 270 }, data: { label: 'GET /api/performing-ad-templates' }, style: nodeStyles.api },
  { id: 'api-idea-bank', position: { x: 740, y: 320 }, data: { label: 'POST /api/idea-bank/suggest' }, style: nodeStyles.api },

  // Relationships & Enrichment
  { id: 'api-relationships', position: { x: 910, y: 220 }, data: { label: 'GET /api/products/:id/relationships\nPOST /api/product-relationships' }, style: nodeStyles.api },
  { id: 'api-enrich', position: { x: 910, y: 270 }, data: { label: 'POST /api/products/:id/enrich' }, style: nodeStyles.api },
  { id: 'api-relationship-rag', position: { x: 910, y: 320 }, data: { label: 'POST /api/relationships/*' }, style: nodeStyles.rag },

  // RAG Endpoints
  { id: 'api-installation-rag', position: { x: 1080, y: 220 }, data: { label: 'POST /api/installation/*' }, style: nodeStyles.rag },
  { id: 'api-template-rag', position: { x: 1080, y: 270 }, data: { label: 'POST /api/templates/*' }, style: nodeStyles.rag },
  { id: 'api-brand-rag', position: { x: 1080, y: 320 }, data: { label: 'POST /api/brand-images/recommend' }, style: nodeStyles.rag },

  // ========== ORCHESTRATOR LAYER ==========
  { id: 'orch-label', position: { x: 50, y: 400 }, data: { label: '🎭 ORCHESTRATORS (AI Coordinators)' }, type: 'default', style: { ...nodeStyles.group, width: 1400, height: 100, background: 'rgba(250, 112, 154, 0.1)' } },

  { id: 'ideabank-service', position: { x: 150, y: 440 }, data: { label: '🧠 IdeaBankService\n(Main AI Orchestrator)' }, style: nodeStyles.orchestrator },
  { id: 'copywriting-service', position: { x: 400, y: 440 }, data: { label: '✍️ CopywritingService\n(PTCF Framework)' }, style: nodeStyles.orchestrator },
  { id: 'enrichment-service', position: { x: 650, y: 440 }, data: { label: '🔬 ProductEnrichmentService\n(Draft + Verify)' }, style: nodeStyles.orchestrator },

  // ========== AI TOOLS LAYER ==========
  { id: 'tools-label', position: { x: 50, y: 540 }, data: { label: '🔧 AI TOOLS (Internal Services)' }, type: 'default', style: { ...nodeStyles.group, width: 1400, height: 100, background: 'rgba(245, 87, 108, 0.1)' } },

  { id: 'vision-service', position: { x: 80, y: 580 }, data: { label: '👁️ VisionAnalysis\nService' }, style: nodeStyles.service },
  { id: 'product-knowledge', position: { x: 230, y: 580 }, data: { label: '📚 ProductKnowledge\nService' }, style: nodeStyles.service },
  { id: 'image-gen-handler', position: { x: 380, y: 580 }, data: { label: 'ImageGeneration\nHandler' }, style: nodeStyles.service },

  // RAG Services
  { id: 'installation-rag', position: { x: 550, y: 580 }, data: { label: '🔧 InstallationScenario\nRAG' }, style: nodeStyles.rag },
  { id: 'relationship-rag', position: { x: 700, y: 580 }, data: { label: '🔗 RelationshipDiscovery\nRAG' }, style: nodeStyles.rag },
  { id: 'brand-image-rag', position: { x: 860, y: 580 }, data: { label: '🖼️ BrandImageRecommend\nRAG' }, style: nodeStyles.rag },
  { id: 'template-rag', position: { x: 1020, y: 580 }, data: { label: '📐 TemplatePattern\nRAG' }, style: nodeStyles.rag },

  // ========== KNOWLEDGE LAYER ==========
  { id: 'kb-label', position: { x: 50, y: 680 }, data: { label: '📖 KNOWLEDGE LAYER' }, type: 'default', style: { ...nodeStyles.group, width: 700, height: 80, background: 'rgba(79, 172, 254, 0.1)' } },

  { id: 'file-search', position: { x: 250, y: 710 }, data: { label: '📁 FileSearchService\n(Vector Store Hub)' }, style: { ...nodeStyles.rag, padding: '14px 24px', fontSize: '14px' } },

  // ========== INFRASTRUCTURE LAYER ==========
  { id: 'infra-label', position: { x: 800, y: 680 }, data: { label: '⚙️ INFRASTRUCTURE' }, type: 'default', style: { ...nodeStyles.group, width: 650, height: 80, background: 'rgba(55, 65, 81, 0.2)' } },

  { id: 'gemini-service', position: { x: 850, y: 710 }, data: { label: '🤖 GeminiService\n(LLM API)' }, style: nodeStyles.infra },
  { id: 'storage', position: { x: 1000, y: 710 }, data: { label: '💾 Storage\n(Drizzle/PostgreSQL)' }, style: nodeStyles.infra },
  { id: 'auth-service', position: { x: 1150, y: 710 }, data: { label: '🔐 AuthService' }, style: nodeStyles.infra },
];

// Define all edges (connections)
const initialEdges: Edge[] = [
  // ========== UI → API Connections ==========
  // Studio connections
  { id: 'e-studio-transform', source: 'studio', target: 'api-transform', animated: true, style: { stroke: '#667eea' }, label: 'Generate', markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e-studio-products', source: 'studio', target: 'api-products', style: { stroke: '#667eea' }, label: 'Load Products' },
  { id: 'e-studio-ideabank', source: 'studio', target: 'api-idea-bank', animated: true, style: { stroke: '#667eea' }, label: 'Get Suggestions' },
  { id: 'e-studio-copy', source: 'studio', target: 'api-copy-generate', style: { stroke: '#667eea' }, label: 'Generate Copy' },

  // ProductLibrary connections
  { id: 'e-products-api', source: 'products', target: 'api-products', style: { stroke: '#667eea' } },
  { id: 'e-products-delete', source: 'products', target: 'api-products-delete', style: { stroke: '#ef4444' }, label: 'Delete' },
  { id: 'e-products-relationships', source: 'products', target: 'api-relationships', style: { stroke: '#667eea' } },
  { id: 'e-products-enrich', source: 'products', target: 'api-enrich', animated: true, style: { stroke: '#667eea' }, label: 'Enrich' },

  // Brand connections
  { id: 'e-brand-api', source: 'brand', target: 'api-brand-profile', style: { stroke: '#667eea' } },
  { id: 'e-brandimg-api', source: 'brand-images', target: 'api-brand-images', style: { stroke: '#667eea' } },
  { id: 'e-brandimg-analyze', source: 'brand-images', target: 'api-analyze-image', animated: true, style: { stroke: '#667eea' }, label: 'AI Analyze' },

  // Templates connections
  { id: 'e-templates-api', source: 'templates', target: 'api-templates', style: { stroke: '#667eea' } },

  // Gallery connections
  { id: 'e-gallery-api', source: 'gallery', target: 'api-generations', style: { stroke: '#667eea' } },

  // Generation Detail connections
  { id: 'e-gendetail-edit', source: 'generation-detail', target: 'api-generation-edit', animated: true, style: { stroke: '#667eea' }, label: 'Edit' },

  // Login connections
  { id: 'e-login-auth', source: 'login', target: 'api-auth-login', style: { stroke: '#667eea' } },

  // ========== API → Orchestrator Connections ==========
  { id: 'e-ideabank-orch', source: 'api-idea-bank', target: 'ideabank-service', animated: true, style: { stroke: '#11998e', strokeWidth: 2 } },
  { id: 'e-transform-handler', source: 'api-transform', target: 'image-gen-handler', animated: true, style: { stroke: '#11998e', strokeWidth: 2 } },
  { id: 'e-copy-orch', source: 'api-copy-generate', target: 'copywriting-service', animated: true, style: { stroke: '#11998e', strokeWidth: 2 } },
  { id: 'e-enrich-orch', source: 'api-enrich', target: 'enrichment-service', animated: true, style: { stroke: '#11998e', strokeWidth: 2 } },
  { id: 'e-analyze-orch', source: 'api-analyze-image', target: 'ideabank-service', style: { stroke: '#11998e' } },

  // ========== Orchestrator → AI Tools ==========
  { id: 'e-orch-vision', source: 'ideabank-service', target: 'vision-service', animated: true, style: { stroke: '#fa709a' } },
  { id: 'e-orch-knowledge', source: 'ideabank-service', target: 'product-knowledge', animated: true, style: { stroke: '#fa709a' } },

  // Enrichment orchestrator connections
  { id: 'e-enrich-vision', source: 'enrichment-service', target: 'vision-service', style: { stroke: '#fa709a' } },

  // ========== RAG API → RAG Services ==========
  { id: 'e-api-install-rag', source: 'api-installation-rag', target: 'installation-rag', style: { stroke: '#4facfe' } },
  { id: 'e-api-relationship-rag', source: 'api-relationship-rag', target: 'relationship-rag', style: { stroke: '#4facfe' } },
  { id: 'e-api-template-rag', source: 'api-template-rag', target: 'template-rag', style: { stroke: '#4facfe' } },
  { id: 'e-api-brand-rag', source: 'api-brand-rag', target: 'brand-image-rag', style: { stroke: '#4facfe' } },

  // ========== AI Tools → Knowledge Layer ==========
  { id: 'e-install-kb', source: 'installation-rag', target: 'file-search', animated: true, style: { stroke: '#4facfe' } },
  { id: 'e-rel-kb', source: 'relationship-rag', target: 'file-search', animated: true, style: { stroke: '#4facfe' } },
  { id: 'e-ideabank-kb', source: 'ideabank-service', target: 'file-search', animated: true, style: { stroke: '#4facfe' } },

  // ========== Services → Infrastructure ==========
  { id: 'e-vision-gemini', source: 'vision-service', target: 'gemini-service', style: { stroke: '#f5576c' } },
  { id: 'e-imagegen-gemini', source: 'image-gen-handler', target: 'gemini-service', style: { stroke: '#f5576c' } },
  { id: 'e-copy-gemini', source: 'copywriting-service', target: 'gemini-service', animated: true, style: { stroke: '#f5576c' } },
  { id: 'e-ideabank-gemini', source: 'ideabank-service', target: 'gemini-service', animated: true, style: { stroke: '#f5576c' } },
  { id: 'e-enrich-gemini', source: 'enrichment-service', target: 'gemini-service', style: { stroke: '#f5576c' } },
  { id: 'e-filesearch-gemini', source: 'file-search', target: 'gemini-service', style: { stroke: '#4facfe' } },

  // Storage connections
  { id: 'e-products-storage', source: 'api-products', target: 'storage', style: { stroke: '#374151' } },
  { id: 'e-transform-storage', source: 'api-transform', target: 'storage', style: { stroke: '#374151' } },
  { id: 'e-gen-storage', source: 'api-generations', target: 'storage', style: { stroke: '#374151' } },
  { id: 'e-brand-storage', source: 'api-brand-profile', target: 'storage', style: { stroke: '#374151' } },
  { id: 'e-brandimg-storage', source: 'api-brand-images', target: 'storage', style: { stroke: '#374151' } },
  { id: 'e-copy-storage', source: 'api-copy-generate', target: 'storage', style: { stroke: '#374151' } },
  { id: 'e-product-knowledge-storage', source: 'product-knowledge', target: 'storage', style: { stroke: '#374151' } },

  // Auth connections
  { id: 'e-authme-service', source: 'api-auth-me', target: 'auth-service', style: { stroke: '#374151' } },
  { id: 'e-authlogin-service', source: 'api-auth-login', target: 'auth-service', style: { stroke: '#374151' } },
];

export default function SystemMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const legend = useMemo(() => [
    { color: '#667eea', label: 'UI Pages', icon: '🖥️' },
    { color: '#11998e', label: 'API Endpoints', icon: '🔌' },
    { color: '#fa709a', label: 'Orchestrators', icon: '🎭' },
    { color: '#f5576c', label: 'AI Tools', icon: '🔧' },
    { color: '#4facfe', label: 'RAG Services', icon: '📖' },
    { color: '#374151', label: 'Infrastructure', icon: '⚙️' },
  ], []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0f0f1a' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <Background color="#1a1a2e" gap={20} />
        <Controls style={{ background: '#1a1a2e', borderRadius: '8px' }} />
        <MiniMap
          nodeColor={(node) => {
            if (node.id.startsWith('ui-') || node.id === 'studio' || node.id === 'products' || node.id === 'brand' || node.id === 'brand-images' || node.id === 'templates' || node.id === 'gallery' || node.id === 'generation-detail' || node.id === 'login') return '#667eea';
            if (node.id.startsWith('api-')) return '#11998e';
            if (node.id.includes('service') || node.id.includes('orch')) return '#fa709a';
            if (node.id.includes('rag')) return '#4facfe';
            return '#374151';
          }}
          style={{ background: '#1a1a2e', borderRadius: '8px' }}
        />

        {/* Title Panel */}
        <Panel position="top-center">
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            padding: '16px 32px',
            borderRadius: '12px',
            border: '1px solid #374151',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
            <h1 style={{
              margin: 0,
              color: 'white',
              fontSize: '24px',
              fontWeight: 700,
              textAlign: 'center',
            }}>
              🗺️ System Architecture Map
            </h1>
            <p style={{
              margin: '8px 0 0 0',
              color: '#9ca3af',
              fontSize: '14px',
              textAlign: 'center',
            }}>
              Interactive visualization of UI → API → Services → Infrastructure
            </p>
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="top-left">
          <div style={{
            background: 'rgba(26, 26, 46, 0.95)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #374151',
            marginTop: '100px',
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '14px' }}>Legend</h3>
            {legend.map((item) => (
              <div key={item.label} style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px',
                gap: '8px',
              }}>
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <div style={{
                  width: '20px',
                  height: '4px',
                  background: item.color,
                  borderRadius: '2px'
                }} />
                <span style={{ color: '#d1d5db', fontSize: '12px' }}>{item.label}</span>
              </div>
            ))}
            <div style={{ marginTop: '12px', borderTop: '1px solid #374151', paddingTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '20px', height: '2px', background: '#667eea' }} />
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>Static connection</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '2px',
                  background: 'linear-gradient(90deg, #667eea 0%, transparent 50%, #667eea 100%)',
                  animation: 'pulse 1s infinite',
                }} />
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>AI-powered flow</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Stats Panel */}
        <Panel position="top-right">
          <div style={{
            background: 'rgba(26, 26, 46, 0.95)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #374151',
            marginTop: '100px',
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'white', fontSize: '14px' }}>System Stats</h3>
            <div style={{ color: '#d1d5db', fontSize: '12px' }}>
              <div style={{ marginBottom: '6px' }}>🖥️ UI Pages: <strong>8</strong></div>
              <div style={{ marginBottom: '6px' }}>🔌 API Endpoints: <strong>27</strong></div>
              <div style={{ marginBottom: '6px' }}>🎭 Orchestrators: <strong>3</strong></div>
              <div style={{ marginBottom: '6px' }}>🔧 AI Tools: <strong>7</strong></div>
              <div style={{ marginBottom: '6px' }}>📖 RAG Services: <strong>4</strong></div>
              <div>⚙️ Infrastructure: <strong>3</strong></div>
            </div>
          </div>
        </Panel>

        {/* Instructions Panel */}
        <Panel position="bottom-center">
          <div style={{
            background: 'rgba(26, 26, 46, 0.9)',
            padding: '12px 24px',
            borderRadius: '8px',
            border: '1px solid #374151',
          }}>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
              🖱️ Drag to pan • 🔍 Scroll to zoom • 📍 Click nodes to select • Use minimap for navigation
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
