Now we step into how real DevOps engineers work: **Declarative Infrastructure**.

In production, you don't type commands to create resources on the fly. You write files (YAML files) that describe your **desired state** (e.g., *"I want 2 copies of NGINX running at all times"*), commit them to Git, and tell Kubernetes: **"Make the cluster look like this file."**

This brings us to **Step 3: Writing Your First YAML Manifest and Creating a Self-Healing Deployment**.

---

### What is a Deployment?

In Step 2, you learned that an isolated Pod won't revive itself if it dies. 

A **Deployment** is a supervisor:
1. You tell the Deployment: *"Keep 2 copies (replicas) of my Pod running."*
2. The Deployment continuously monitors the cluster.
3. If a Pod crashes, gets deleted, or a machine fails, the Deployment **automatically creates a new Pod** to take its place.

---

### Step 3.1: Set Up a Working Folder

Open your terminal, create a directory for your Kubernetes files, and navigate into it:

```bash
mkdir k8s-learning
cd k8s-learning
```

---

### Step 3.2: Create the Deployment YAML

Create a file named `deployment.yaml` using your favorite text editor (VS Code, Notepad, Nano, or Vim). 

Paste the following content inside it:

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
        image: nginx:alpine
        ports:
        - containerPort: 80
```

---

### Step 3.3: Understanding the 4 Core Building Blocks of Every Kubernetes YAML

Every single Kubernetes file you will ever write follows this standard skeleton:

1. **`apiVersion`**: Specifies which version of the Kubernetes API to talk to. For Deployments, it is `apps/v1`.
2. **`kind`**: Tells Kubernetes *what* type of object you want to create (e.g., `Deployment`, `Pod`, `Service`).
3. **`metadata`**: Data that identifies the object (its `name`, and optional tags called `labels`).
4. **`spec` (Specification)**: **The most important part.** This describes the desired state.
   * `replicas: 2`: We want exactly 2 copies of this Pod running.
   * `template`: The blueprint for the Pods the Deployment will create. Everything under `template:` is literally the specification of a Pod:
     * It uses the lightweight `nginx:alpine` image.
     * It exposes port `80`.

> **Notice the Label Connection (Important Concept):**
> Look at `selector.matchLabels: app: my-web-app` and `template.metadata.labels: app: my-web-app`. 
> 
> How does the Deployment know *which* Pods belong to it? It tracks them using **Labels** (key-value tags). The selector says: *"Count and manage all Pods tagged with `app: my-web-app`."*

---

### Step 3.4: Apply the Manifest

In your terminal (inside the `k8s-learning` folder), apply the file to your cluster:

```bash
kubectl apply -f deployment.yaml
```

* `-f` stands for "file".
* `kubectl apply` compares what is currently in your cluster with what is in the file, and makes the necessary adjustments.

**Expected output:**
```text
deployment.apps/my-web-app created
```

---

### Step 3.5: Inspect the Hierarchy

Let’s see what Kubernetes created behind the scenes:

```bash
kubectl get deployments
```
**Output:**
```text
NAME         READY   UP-TO-DATE   AVAILABLE   AGE
my-web-app   2/2     2            2           20s
```
* `READY 2/2` means both requested replicas are up and healthy.

Now list your Pods:

```bash
kubectl get pods
```
**Output:**
```text
NAME                          READY   STATUS    RESTARTS   AGE
my-web-app-79888d946d-abc12   1/1     Running   0          30s
my-web-app-79888d946d-xyz89   1/1     Running   0          30s
```
Notice the Pod names: Kubernetes generated unique random suffixes for each Pod managed by this Deployment.

---

### Step 3.6: The Self-Healing Experiment (The "Aha!" Moment)

Let’s test if Kubernetes truly self-heals.

1. Pick **one** of the Pod names from your `kubectl get pods` list.
2. Manually delete it:

```bash
kubectl delete pod <PASTE-YOUR-POD-NAME-HERE>
```

3. As soon as the terminal says `deleted`, immediately run:

```bash
kubectl get pods
```

**What you will see:**
The Pod you deleted is either `Terminating` or gone. But right next to it, **a brand-new Pod with a new random ID is already running or creating!**

Why? Because you told Kubernetes: *"I want 2 replicas at all times."* The moment you deleted one, the count dropped to 1. The Deployment detected the discrepancy and immediately spun up a replacement to satisfy your desired state.

---

### Your Turn
1. Create the `deployment.yaml` file and run `kubectl apply -f deployment.yaml`.
2. Verify the 2 pods are running.
3. Perform the **Self-Healing Experiment** by deleting one pod.
4. Let me know what you observe, and once verified, we will move to **Step 4: Networking — How to access your application from your browser using a Service**.