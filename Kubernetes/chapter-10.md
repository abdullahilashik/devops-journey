In a real engineering organization, a cluster is never used by just one person or for a single app. 

You might have multiple teams (Frontend, Payments, Analytics) or multiple environments (`staging`, `qa`, `dev`) sharing the same physical hardware. If everyone dumps their manifests into one bucket, name collisions happen, permissions become impossible to manage, and someone will accidentally delete someone else's database.

This brings us to **Step 10: Organizing and Isolating Environments with Namespaces**.

---

### What is a Namespace?

A **Namespace** is a virtual cluster inside your physical Kubernetes cluster. 

Think of your cluster as an apartment building, and Namespaces as the individual apartments:
* Inside Apartment 101, you can have a cat named "Milo".
* Inside Apartment 102, you can also have a cat named "Milo".
* They share the same foundation and plumbing, but their living spaces are completely separate.

---

### Step 10.1: Inspect the Built-in Namespaces

Run this command to see what namespaces already exist in your Docker Desktop cluster:

```bash
kubectl get namespaces
```
*(Shortcut: `kubectl get ns`)*

**Output:**
```text
NAME              STATUS   AGE
default           Active   3d
kube-node-lease   Active   3d
kube-public       Active   3d
kube-system       Active   3d
```

Let's understand what these are:
* **`default`**: Where all your work has lived so far. If you don't specify a namespace, Kubernetes automatically puts your objects here.
* **`kube-system`**: **Do not touch!** This is where Kubernetes runs its own internal control plane components (DNS, cluster networking, proxy).
* **`kube-public` & `kube-node-lease`**: System namespaces used for cluster health checks and public cluster discovery.

---

### Step 10.2: Create a `staging` Namespace Declaratively

Let's create a dedicated environment for staging. 

In your `k8s-learning` folder, create a file named `namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
```

Dissecting the file:
* **`apiVersion: v1`**: Namespaces are core objects.
* **`kind: Namespace`**: The type of object.
* **`metadata.name: staging`**: The name of our new virtual environment.

Apply it:

```bash
kubectl apply -f namespace.yaml
```

**Verify:**
```bash
kubectl get ns
```
You will now see `staging` listed as `Active`.

---

### Step 10.3: Deploying Resources into a Namespace

There are two ways to tell Kubernetes to deploy an object into a specific namespace:

#### Method A: In the YAML file itself (Best practice for production)
You add `namespace: staging` directly under the `metadata:` section of every resource:
```yaml
metadata:
  name: my-web-app
  namespace: staging
```

#### Method B: At the command line (Fast and flexible)
You add the `-n` (or `--namespace`) flag to `kubectl apply`:
```bash
kubectl apply -f <file> -n staging
```

Let's use **Method B** right now to deploy our entire stack into `staging`:

```bash
kubectl apply -f configmap.yaml -n staging
kubectl apply -f secret.yaml -n staging
kubectl apply -f deployment.yaml -n staging
```

---

### Step 10.4: Where Did Everything Go? (The Isolation Check)

Run your usual check:

```bash
kubectl get pods
```

**Look at what happened:**
You only see the Pods running in the `default` namespace! Your new staging deployment isn't listed here.

To view resources inside your new namespace, you must explicitly ask for them:

```bash
kubectl get pods -n staging
```

**Expected output:**
```text
NAME                          READY   STATUS    RESTARTS   AGE
my-web-app-xxxxxxxxxx-12345   1/1     Running   0          30s
my-web-app-xxxxxxxxxx-67890   1/1     Running   0          30s
```

You can do the same for all resources:
```bash
kubectl get deployments,configmaps,secrets -n staging
```

#### The "View Everything" Command:
If you want to see all pods across **all** namespaces simultaneously:
```bash
kubectl get pods -A
```
*(The `-A` flag stands for `--all-namespaces`).*

---

### Step 10.5: Senior Engineer Tip — What is Namespaced and What Isn't?

Not everything in Kubernetes can be divided into namespaces.

| Namespaced (Isolated per environment) | Cluster-Wide (Shared across the whole cluster) |
| :--- | :--- |
| Pods | Nodes (physical / VM servers) |
| Deployments | Namespaces themselves |
| Services | PersistentVolumes (physical disks) |
| ConfigMaps & Secrets | StorageClasses |
| Ingress rules | ClusterRoles & ClusterRoleBindings (cluster-level permissions) |

To see the complete list of which resources are namespaced on your system, you can run:
```bash
kubectl api-resources --namespaced=true
```

---

### Step 10.6: The Power of Namespace Cleanup

One of the greatest benefits of namespaces in DevOps is **environment cleanup**.

If a feature test is over or a staging environment is no longer needed, you don't have to delete Deployments, Services, Secrets, and ConfigMaps individually.

You simply delete the namespace:

```bash
kubectl delete namespace staging
```

**What happens behind the scenes:**
Kubernetes gracefully stops every Pod, deletes the Deployment, cleans up all Secrets and ConfigMaps associated with `staging`, and finally deletes the namespace itself.

Verify that your `default` namespace was completely untouched:
```bash
kubectl get pods
```
Your original Pods in `default` are still running smoothly.

---

### Your Turn
1. Create `namespace.yaml` and apply it to create `staging`.
2. Apply your `configmap.yaml`, `secret.yaml`, and `deployment.yaml` using the `-n staging` flag.
3. Compare the output of `kubectl get pods` vs. `kubectl get pods -n staging`.
4. Delete the namespace with `kubectl delete namespace staging` to see automated teardown.

Let me know once you've tested this, and we will take on **Step 11: Persistent Storage — Storing Data That Survives Pod Restarts (PV, PVC, and StorageClass)**.