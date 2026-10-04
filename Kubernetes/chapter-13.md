Right now, when you run `kubectl` commands, you are operating as `docker-desktop` with **Cluster-Admin** privileges—essentially the "root" superuser. You can create, read, and delete anything in the entire cluster.

In production, giving everyone or every automated tool admin access is a recipe for catastrophic security breaches. 

* A CI/CD deployment bot (like GitHub Actions) only needs permission to update Deployments, not read production database passwords.
* A junior developer may need to view logs and Pod statuses, but must never be allowed to delete namespaces or modify network configurations.

We enforce this using **Step 13: Role-Based Access Control (RBAC) & ServiceAccounts**.

---

### The RBAC Formula: Three Moving Parts

RBAC in Kubernetes works like a security badge system:

1. **The Subject (Who?):** A human user, or for applications and automated pipelines, a **`ServiceAccount`**.
2. **The Role (What?):** A permission list defining *which resources* can be touched and *which actions (verbs)* are allowed.
3. **The RoleBinding (The Glue):** The bridge that attaches the **Subject** to the **Role**.

```text
[ServiceAccount: app-deployer]  <-- The Identity ("Who")
              |
              v  (attached via RoleBinding)
       [Role: pod-reader]        <-- The Permissions ("What")
              |
   Can: [get, list, watch]
   On:  [pods]
```

---

### Step 13.1: Create `rbac.yaml`

Let's simulate a scenario: We want an automated bot (a `ServiceAccount`) called `app-deployer`. This bot should only be allowed to **view** Pods in the `default` namespace. It should **not** be allowed to delete Pods or view sensitive Secrets.

In your `k8s-learning` folder, create a file named `rbac.yaml`:

```yaml
# 1. THE IDENTITY (Who)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-deployer
  namespace: default
---
# 2. THE PERMISSIONS (What)
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: default
rules:
- apiGroups: [""]            # Core API group (where Pods live)
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
---
# 3. THE GLUE (Attaching Who to What)
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: app-deployer
  namespace: default
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

---

### Step 13.2: Dissecting `rbac.yaml`

Notice the triple dashes (`---`). In YAML, `---` allows you to define multiple Kubernetes resources in a single file.

#### 1. `kind: ServiceAccount`
* An identity created inside Kubernetes for an application, automation script, or CI/CD runner.

#### 2. `kind: Role`
* **`apiGroups: [""]`**: The core API group is denoted by an empty string `""`. Workload resources like Deployments would belong to `"apps"`.
* **`resources: ["pods", "pods/log"]`**: The specific targets this role can interact with.
* **`verbs: ["get", "list", "watch"]`**: The permitted actions:
  * `get`: View a single pod by name (`kubectl get pod my-pod`).
  * `list`: View all pods in the namespace (`kubectl get pods`).
  * `watch`: Stream real-time events.
  * *Notice what is missing:* `create`, `update`, `delete` are completely absent.

#### 3. `kind: RoleBinding`
* **`subjects:`**: Points to the `app-deployer` ServiceAccount.
* **`roleRef:`**: Points to the `pod-reader` Role.

---

### Step 13.3: Apply the RBAC Rules

Apply the configuration:

```bash
kubectl apply -f rbac.yaml
```

**Output:**
```text
serviceaccount/app-deployer created
role.rbac.authorization.k8s.io/pod-reader created
rolebinding.rbac.authorization.k8s.io/read-pods-binding created
```

---

### Step 13.4: The Senior Engineer Tool: `kubectl auth can-i`

How do you verify whether permissions work without having to log in as that user?

Kubernetes provides a built-in authorization tester: **`kubectl auth can-i`**. You can impersonate any user or ServiceAccount using the `--as` flag.

Let's test our `app-deployer` ServiceAccount:

#### Test 1: Can this account list Pods?
```bash
kubectl auth can-i list pods --as=system:serviceaccount:default:app-deployer
```
**Output:**
```text
yes
```

#### Test 2: Can this account delete a Pod?
```bash
kubectl auth can-i delete pods --as=system:serviceaccount:default:app-deployer
```
**Output:**
```text
no
```

#### Test 3: Can this account view Secrets?
```bash
kubectl auth can-i get secrets --as=system:serviceaccount:default:app-deployer
```
**Output:**
```text
no
```

#### Test 4: Can this account list Pods in another namespace (e.g. `kube-system`)?
```bash
kubectl auth can-i list pods -n kube-system --as=system:serviceaccount:default:app-deployer
```
**Output:**
```text
no
```
*(Because a `Role` is strictly confined to the namespace where it was created—in this case, `default`).*

---

### Step 13.5: Role vs. ClusterRole

Understanding this distinction is a frequent interview checkpoint:

| Type | Scope | Use Case |
| :--- | :--- | :--- |
| **`Role`** & **`RoleBinding`** | **Single Namespace** | Scoped to one environment (e.g., allow a developer or bot to work only inside `staging`). |
| **`ClusterRole`** & **`ClusterRoleBinding`** | **Entire Cluster** | Cluster-wide resources (e.g., reading Nodes, PersistentVolumes, or giving a global monitoring tool like Prometheus read access across all namespaces). |

---

### Your Turn
1. Create `rbac.yaml` with the ServiceAccount, Role, and RoleBinding.
2. Apply it to your cluster.
3. Run the four `kubectl auth can-i` commands to verify that permissions are enforced as expected.

Once you confirm the `yes` and `no` outputs, let me know. Next, we will cover **Step 14: Helm — The Package Manager for Kubernetes (Templating & Reusability)**.