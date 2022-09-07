import * as k8s from "@pulumi/kubernetes";
import * as kx from "@pulumi/kubernetesx";
import * as fs from "fs";

const appLabels = { app: "grafana" };

const configMap = new k8s.core.v1.ConfigMap("grafana-datasources", {
    metadata: {
        namespace: "monitoring",
        name: "grafana-datasources",
    },
    data: {
        "prometheus.yaml": fs.readFileSync('prometheus.yaml').toString(),
    },
});

// Create a Deployment
const grafana = new k8s.apps.v1.Deployment("grafana", {
    metadata: {
        name: "grafana",
        namespace: "monitoring",
        labels: appLabels,
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: appLabels,
        },
        template: {
            metadata: {
                labels: appLabels,
            },
            spec: {
                containers: [
                    {
                        name: "grafana",
                        image: "grafana/grafana:latest",
                        ports: [
                            {
                                name: "grafana",
                                containerPort: 3000,
                            },
                        ],
                        resources: {
                            limits: {
                                memory: "2Gi",
                                cpu: "1000m",
                            },
                            requests: {
                                memory: "1Gi",
                                cpu: "500m",
                            },
                        },
                        volumeMounts: [
                            {
                                mountPath: "/var/lib/grafana",
                                name: "grafana-storage",
                            },
                            {
                                mountPath: "/etc/grafana/provisioning/datasources",
                                name: "grafana-datasources",
                                readOnly: false,
                            },
                        ],
                    },
                ],
                volumes: [
                    {
                        name: "grafana-storage",
                        emptyDir: {},
                    },
                    {
                        name: "grafana-datasources",
                        configMap: {
                            defaultMode: 420,
                            name: "grafana-datasources",
                        },
                    },
                ],
            },
        },
    },
});


// Create a Service
const grafanaService = new k8s.core.v1.Service("grafana", {
    metadata: {
        name: "grafana",
        namespace: "monitoring",
        annotations: {
            "prometheus.io/scrape": "true",
            "prometheus.io/port": "3000",
        },
    },
    spec: {
        type: "NodePort",
        ports: [
            {
                port: 3000,
                targetPort: 3000,
                nodePort: 32000,
            },
        ],
        selector: appLabels,
    },
});


export const name =  grafana.metadata.name;
