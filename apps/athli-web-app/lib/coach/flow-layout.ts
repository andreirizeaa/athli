import dagre from '@dagrejs/dagre';
import { type Node, type Edge } from 'reactflow';

export const getLayoutedElements = async (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({
        rankdir: 'TB',
        nodesep: 150,
        ranksep: 30, // Baseline vertical gap
        marginx: 0,
        marginy: 0,
        ranker: 'network-simplex', // Generally more stable for ordering
    });

    // 1. Identify roots and build adjacency list
    const incomingEdges = new Set(edges.map(e => e.target));
    const roots = nodes.filter(n => !incomingEdges.has(n.id));

    const adj: Record<string, { target: string, handle?: string }[]> = {};
    edges.forEach(e => {
        if (!adj[e.source]) adj[e.source] = [];
        adj[e.source].push({ target: e.target, handle: e.sourceHandle ?? undefined });
    });

    // 2. Traversal to add nodes and edges in a specific order (Yes branch first)
    const visited = new Set<string>();

    const addNodeToGraph = (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Using 64px virtual height for actions to pull icons closer
        let height = 64;
        if (node.type === 'addAction') height = 40;
        else if (node.type === 'end') height = 40;

        dagreGraph.setNode(node.id, { width: 300, height: height });
    };

    const traverse = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        addNodeToGraph(nodeId);

        const node = nodes.find(n => n.id === nodeId);
        const children = adj[nodeId] || [];
        const sortedChildren = [...children].sort((a, b) => {
            if (a.handle === 'yes') return -1;
            if (b.handle === 'yes') return 1;
            if (a.handle === 'no' && b.handle !== 'yes') return 1;
            if (b.handle === 'no' && a.handle !== 'yes') return -1;
            return 0;
        });

        sortedChildren.forEach(child => {
            // Apply double spacing (60px) for edges coming out of Check nodes
            const edgeOptions = node?.type === 'check' ? { minlen: 2 } : {};
            dagreGraph.setEdge(nodeId, child.target, edgeOptions);
            traverse(child.target);
        });
    };

    roots.forEach(root => traverse(root.id));

    // Catch any orphaned nodes that might have been missed
    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            addNodeToGraph(node.id);
        }
    });

    dagre.layout(dagreGraph);

    // 3. Post-layout adjustment: Align all nodes in a rank to the TOP of the rank
    const nodesWithDagre = nodes.map(n => ({ ...n, dagre: dagreGraph.node(n.id) }));
    const nodesByY: Record<number, typeof nodesWithDagre> = {};

    nodesWithDagre.forEach(n => {
        const y = n.dagre.y;
        if (!nodesByY[y]) nodesByY[y] = [];
        nodesByY[y].push(n);
    });

    const layoutedNodes = nodesWithDagre.map((node) => {
        const sameRankNodes = nodesByY[node.dagre.y];
        const maxHInRank = Math.max(...sameRankNodes.map(sn => sn.dagre.height));

        // Dagre positions are centered. The top of the rank is at y - maxH/2.
        const rankTop = node.dagre.y - maxHInRank / 2;

        return {
            ...node,
            position: {
                x: Math.round(node.dagre.x - node.dagre.width / 2),
                y: Math.round(rankTop),
            },
        };
    });

    // 4. Normalization: Anchor the layout to the Trigger node
    // This prevents the graph from jumping when structural changes (like deletion) 
    // shift Dagre's default coordinate origin.
    const triggerNode = layoutedNodes.find(n => n.id === 'trigger');
    if (triggerNode) {
        const offsetX = triggerNode.position.x;
        const offsetY = triggerNode.position.y;

        layoutedNodes.forEach(node => {
            node.position.x -= offsetX;
            node.position.y -= offsetY;
        });
    }

    return {
        nodes: layoutedNodes,
        edges,
    };
};
