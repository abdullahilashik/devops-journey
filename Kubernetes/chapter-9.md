In production, if you don't restrict how much hardware your containers can consume, you are sitting on a ticking time bomb.

A single buggy container with a memory leak or an infinite loop can consume 100% of your machine's CPU and RAM. When that happens, the host node crashes, taking down every other unrelated application with it. This is known as the **"Noisy Neighbor" problem**.

This brings us to **Step 9: Resource Management — CPU and Memory Requests & Limits**.

---

### The Two Rules: Requests vs. Limits

For every container you deploy, you should define two values for CPU and Memory:

| Concept | Meaning | What Kubernetes uses it for |
| :--- | :--- | :--- |
| **`requests`** | **The Minimum Guarantee** | The Kubernetes **Scheduler** uses this to decide *which node* has enough spare room to fit the Pod. If no node has enough free requested capacity, the Pod stays in `Pending`. |
| **`limits`** | **The Hard Ceiling** | The maximum amount of CPU or RAM the container is allowed to use. It cannot exceed this. |

---

### Understanding the Units

Kubernetes measures resources in specific units:

#### 1. CPU Units (Measured in Cores or "Millicores")
* `1` = 1 full CPU core / vCPU.
* `1000m` = 1000 millicores = 1 full CPU core.
* `100m` = 0.1 of a CPU core (plenty for lightweight web servers like NGINX).

#### 2. Memory Units (Measured in Megabytes/Mebibytes)
* `128Mi` = 128 Mebibytes (binary megabytes, standard in Linux).
* `1Gi` = 1 Gibibyte (1024 Mi).

---

### Step 9.1: Add `resources` to `deployment.yaml`

Let's protect our cluster by adding explicit resource constraints to our NGINX deployment.

Open `deployment.yaml` and add the `resources:` block right inside the `containers:` list:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
  labels:
    app: my-web-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-web-app
  template:
    metadata:
      labels:
        app: my-web-app
    spec:
      containers:
      - name: nginx-container
        image: nginx:1.25.5-alpine
        ports:
        - containerPort: 80
        
        # --- RESOURCE CONSTRAINTS START HERE ---
        resources:
          requests:
            cpu: "50m"         # Reserve at least 0.05 CPU core
            memory: "64Mi"     # Reserve at least 64 Megabytes of RAM
          limits:
            cpu: "100m"        # Never let it use more than 0.1 CPU core
            memory: "128Mi"    # Never let it use more than 128 Megabytes of RAM
        # --- RESOURCE CONSTRAINTS END HERE ---

        env:
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: db-password
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 10
        volumeMounts:
        - name: html-volume
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html-volume
        configMap:
          name: web-html-config
```

---

### Step 9.2: Apply the Change

Apply the updated deployment:

```bash
kubectl apply -f deployment.yaml
```

Track the update:

```bash
kubectl rollout status deployment/my-web-app
```

---

### Step 9.3: Inspect QoS (Quality of Service)

When you set requests and limits, Kubernetes automatically assigns a **QoS Class** (Quality of Service) to your Pod. This class tells Kubernetes which Pods to kill first if the server ever runs out of memory.

Run `kubectl describe pod` on one of your Pods:

```bash
kubectl get pods
kubectl describe pod <YOUR-POD-NAME>
```

Look for two sections in the output:

1. **Resources Section:**
```text
Limits:
  cpu:     100m
  memory:  128Mi
Requests:
  cpu:     50m
  memory:  64Mi
```

2. **QoS Class (near the bottom):**
```text
QoS Class: Burstable
```

There are three QoS classes in Kubernetes:
* **`Guaranteed`** (Highest priority): `requests` and `limits` are set to the exact same numbers. Kubernetes will almost never kill these pods.
* **`Burstable`** (Medium priority): `requests` are lower than `limits` (like our setup). It can "burst" up to the limit if the node has spare capacity.
* **`BestEffort`** (Lowest priority): No requests or limits defined. **These are the first Pods terminated** when a node experiences memory pressure.

---

### Step 9.4: The Critical Difference: What Happens When You Exceed Limits?

In production interviews and incidents, this comes up constantly:

#### What happens if CPU limit is exceeded?
* CPU is a **compressible resource**.
* If your container tries to use more than `100m` CPU, Kubernetes **throttles** the container (slows it down). It does **NOT** kill the container.

#### What happens if Memory limit is exceeded?
* Memory is **non-compressible**. You cannot "throttle" RAM.
* If your container tries to consume 129Mi when its limit is `128Mi`, the Linux kernel immediately terminates the process with an **OOM (Out Of Memory) error**.
* Kubernetes will mark the Pod status as **`OOMKilled`** and restart it.

Whenever you see a Pod restarting with `STATUS: OOMKilled`, you know immediately: the container tried to consume more RAM than its defined `limits.memory`.

---

### Your Turn
1. Add the `resources` block to `deployment.yaml` and apply it.
2. Run `kubectl describe pod <YOUR-POD-NAME>` and locate the **Requests**, **Limits**, and **QoS Class**.
3. Confirm once you've seen these fields, and we will move to **Step 10: Isolating Environments with Namespaces**.