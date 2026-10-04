Great, your cluster is up and healthy.

Now we move to **Step 2: The Smallest Building Block in Kubernetes — The Pod**.

---

### What is a Pod?

In Docker, the basic unit of execution is a **Container**. 

In Kubernetes, you **never run a container directly**. Instead, Kubernetes wraps one or more containers into an object called a **Pod**.

* Think of a Pod like a pea pod: the pod is the outer shell, and inside it are one or more peas (containers).
* 95% of the time, a Pod contains just **one** container.
* All containers inside the same Pod share the exact same network IP address and the same storage volumes.

Let’s create your first Pod, inspect it, and learn the single most important troubleshooting command in Kubernetes.

---

### Step 2.1: Create Your First Pod

Open your terminal. We will use `kubectl` to tell the cluster to run an NGINX web server container inside a Pod.

Run this command:

```bash
kubectl run my-first-pod --image=nginx
```

**What this command does:**
* `kubectl run`: Tells Kubernetes to spin up a single Pod.
* `my-first-pod`: The unique name you are assigning to this Pod.
* `--image=nginx`: Tells Kubernetes to download the official `nginx` image from Docker Hub (if it doesn't already have it locally) and run it.

**Expected output:**
```text
pod/my-first-pod created
```

---

### Step 2.2: Check Pod Status

Now let's see if it's actually running:

```bash
kubectl get pods
```

**Expected output:**
```text
NAME           READY   STATUS    RESTARTS   AGE
my-first-pod   1/1     Running   0          15s
```

Let’s decode those columns because you will look at them thousands of times in your career:
* **NAME:** The name you gave the pod (`my-first-pod`).
* **READY (`1/1`):** `[Containers Ready] / [Total Containers in this Pod]`. Here, 1 out of 1 container is running.
* **STATUS (`Running`):** If you ran it immediately, you might briefly see `ContainerCreating` while it downloads the image, followed by `Running`.
* **RESTARTS (`0`):** How many times the container has crashed and restarted.
* **AGE:** How long the pod has existed.

---

### Step 2.3: The Most Important Command: `kubectl describe`

As a DevOps engineer, things will break. When a Pod won't start, your first reaction should always be: **`kubectl describe`**.

Run this:

```bash
kubectl describe pod my-first-pod
```

This will print a detailed report about the Pod. Scroll to the very bottom and look at the **`Events`** table:

```text
Events:
  Type    Reason     Age   From               Message
  ----    ------     ----  ----               -------
  Normal  Scheduled  45s   default-scheduler  Successfully assigned default/my-first-pod to docker-desktop
  Normal  Pulling    44s   kubelet            Pulling image "nginx"
  Normal  Pulled     40s   kubelet            Successfully pulled image "nginx"
  Normal  Created    40s   kubelet            Created container: nginx
  Normal  Started    39s   kubelet            Started container: nginx
```

**Why this matters:**
This event log tells you the exact chronological story of the Pod:
1. **Scheduled:** The Kubernetes scheduler decided *which node* will host the Pod.
2. **Pulling / Pulled:** The node downloaded the container image.
3. **Created:** The container was created from the image.
4. **Started:** The container process started running.

If an image name is misspelled, if your machine runs out of memory, or if the container crashes, the exact reason will show up right here in these **Events**.

---

### Step 2.4: Clean Up

Now, let's delete the Pod so we leave a clean slate:

```bash
kubectl delete pod my-first-pod
```

**Expected output:**
```text
pod "my-first-pod" deleted
```

Verify it is gone:
```bash
kubectl get pods
```
It should say: `No resources found in default namespace.`

---

### The Senior Engineer Insight (Why we don't do this in production)

What we just did is called an **imperative command** (`kubectl run ...`). 

In production, **we almost never create individual, naked Pods like this manually**. Why?
Because if a naked Pod crashes, or if someone accidentally deletes it, **it stays dead**. Kubernetes will not automatically resurrect it.

In real environments, we want self-healing systems. For that, we use an abstraction called a **Deployment**, and we define it using **YAML files (Declarative approach)**.

---

### Your Turn
1. Run the commands above to create the Pod, check its status, describe it to see the events, and then delete it.
2. Once you’re done and see `No resources found`, reply with **"ready"** or **"next"**, and we will dive into **Step 3: Writing your first YAML manifest and creating a self-healing Deployment**.