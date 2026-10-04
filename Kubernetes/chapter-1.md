Welcome to the team. As your senior engineer, my goal isn't just to teach you commands, but to teach you *how to think* about production systems. We will take this step by step—no skipped details, no unexplained jargon. 

Before we write a single YAML file or deploy an application, we need to turn on our lab environment and confirm your command-line tools work.

Here is **Step 1: Enabling Kubernetes and Verifying Your Cluster**.

---

### Understanding the Setup (Quick Concept)
You already have Docker Desktop. Docker by itself runs individual containers. 
**Kubernetes (often abbreviated as k8s)** is an orchestrator: a manager that decides *where*, *when*, and *how* those containers run, automatically restarting them if they crash, scaling them, and routing traffic to them.

Docker Desktop comes with a built-in single-node Kubernetes cluster, but it is turned off by default.

---

### Step 1.1: Enable Kubernetes in Docker Desktop

1. Open **Docker Desktop** on your computer.
2. In the top-right corner, click the **Gear icon** (Settings / Preferences).
3. In the left-hand menu, click on **Kubernetes**.
4. Check the box that says **"Enable Kubernetes"**.
5. *(Optional/Recommended)* Leave "Show system containers" unchecked for now to keep things clean.
6. Click the **"Apply & restart"** button in the bottom right.
7. A prompt will appear asking to confirm installation of cluster components. Click **Install**.

> **Note:** This process downloads several container images that make up the Kubernetes control plane. It might take anywhere from **2 to 10 minutes** depending on your internet connection. 
> 
> Look at the bottom-left corner of Docker Desktop. You should eventually see two green icons: one for **Docker** and one for **Kubernetes** indicating they are both running.

---

### Step 1.2: Verify via the Terminal

Once both lights are green, open your computer's terminal:
* **macOS:** Open *Terminal* or *iTerm2*.
* **Windows:** Open *PowerShell* or *Windows Terminal*.
* **Linux:** Open your default shell.

We are going to use `kubectl` (pronounced *"cube-control"* or *"cube-cuddle"*). This is the official command-line tool used to talk to any Kubernetes cluster. Docker Desktop installs this automatically for you.

Run this command to check if `kubectl` is installed:

```bash
kubectl version --client
```

**Expected output:**
You should see output indicating the client version, like this:
```text
Client Version: v1.30.x (or similar)
Kustomize Version: ...
```

---

### Step 1.3: Verify Cluster Connection

Now let's ask your computer: *"Is my Kubernetes cluster actually responding?"*

Run:

```bash
kubectl cluster-info
```

**Expected output:**
You should see something like:
```text
Kubernetes control plane is running at https://127.0.0.1:6443
CoreDNS is running at https://127.0.0.1:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy
```

Finally, check your "Node" (the single virtual machine running your cluster):

```bash
kubectl get nodes
```

**Expected output:**
```text
NAME             STATUS   ROLES           AGE   VERSION
docker-desktop   Ready    control-plane   1m    v1.30.x
```
* `STATUS: Ready` means your cluster is healthy and ready to accept workloads.

---

### Your Turn
Complete these steps. When you see `STATUS: Ready` after running `kubectl get nodes`, paste that output here or let me know you're ready. 

If you run into any error or if the Kubernetes icon stays yellow/orange, stop and let me know the exact error message. Once verified, we will move to **Step 2: Understanding the smallest building block in Kubernetes (The Pod)**.

