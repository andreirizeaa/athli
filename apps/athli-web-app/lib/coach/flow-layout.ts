import ELK from 'elkjs/lib/elk.bundled.js';
import { type Node, type Edge } from 'reactflow';

const elk = new ELK();

// Default layout options for a balanced, vertical tree
const defaultOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': 'DOWN',
    'elk.layered.spacing.nodeNodeBetweenLayers': '60',
    'elk.layered.spacing.nodeNode': '100', // Horizontal gap between sibling nodes/subtrees
    'elk.layered.nodePlacement.strategy': 'SIMPLE', // Simple but effective for centered trees
    'elk.layered.centering.strategy': 'BALANCED', // Centers nodes relative to their parents and children
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    'elk.padding': '[top=50,left=50,bottom=50,right=50]',
    'org.eclipse.elk.portConstraints': 'FIXED_ORDER',
    'elk.layered.nodePlacement.favorStraightEdges': 'true',
};

export const getLayoutedElements = async (nodes: Node[], edges: Edge[], options = {}) => {
    const layoutOptions = { ...defaultOptions, ...options };

    const graph = {
        id: 'root',
        layoutOptions,
        children: nodes.map((node) => {
            let height = 60;
            if (node.type === 'addAction') height = 24;
            else if (node.type === 'end') height = 30;

            const children: any = {
                ...node,
                width: 300,
                height: height,
                targetPosition: 'top',
                sourcePosition: 'bottom',
            };

            // Define ports to maintain strict branch ordering (Yes=Left, No=Right)
            const ports: any[] = [
                {
                    id: 'input',
                    properties: {
                        'org.eclipse.elk.port.side': 'NORTH',
                        'org.eclipse.elk.port.index': 0,
                    },
                }
            ];

            if (node.type === 'check') {
                ports.push(
                    {
                        id: 'yes',
                        properties: {
                            'org.eclipse.elk.port.side': 'SOUTH',
                            'org.eclipse.elk.port.index': 0, // SOUTH-LEFT
                        },
                    },
                    {
                        id: 'no',
                        properties: {
                            'org.eclipse.elk.port.side': 'SOUTH',
                            'org.eclipse.elk.port.index': 1, // SOUTH-RIGHT
                        },
                    }
                );
            } else {
                ports.push({
                    id: 'output',
                    properties: {
                        'org.eclipse.elk.port.side': 'SOUTH',
                        'org.eclipse.elk.port.index': 0,
                    },
                });
            }

            children.ports = ports;
            return children;
        }),
        edges: edges.map((edge) => ({
            ...edge,
            sources: [edge.source],
            targets: [edge.target],
            sourcePort: edge.sourceHandle || (nodes.find(n => n.id === edge.source)?.type === 'check' ? undefined : 'output'),
            targetPort: 'input',
        })),
    };

    try {
        const layoutedGraph = await elk.layout(graph);

        return {
            nodes: (layoutedGraph.children || []).map((node: any) => ({
                ...node,
                position: { x: node.x, y: node.y },
            })) as Node[],
            edges: (layoutedGraph.edges || []) as Edge[],
        };
    } catch (error) {
        console.error('ELK layout error:', error);
        return { nodes, edges };
    }
};
