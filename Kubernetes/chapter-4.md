Now that your Deployment is running 2 healthy Pods, let's solve the next fundamental problem: **How do users actually access your application?**

This is **Step 4: Kubernetes Networking & The Service Object**.

---

### The Problem: Why Can't We Just Use Pod IPs?

Let’s inspect one of your running Pods to see its IP address. Run this:

```bash
kubectl get pods -o wide
```

Notice the column named **`IP`**. You will see internal IP addresses like `10.1.0.14` and `10.1.0.15`.

There are two major problems with these IPs:
1. **They are internal-only:** Your computer's browser cannot reach `10.1.0.x` directly.
2. **They are ephemeral (temporary):** If a Pod crashes or gets replaced, the new Pod gets a completely **different IP address**. You can't hardcode changing IPs into your frontends or DNS.

---

### The Solution: The Kubernetes `Service`

A **Service** acts as a permanent front door (a stable IP address and DNS name) and an automatic load balancer in front of your Pods.

```text
       [Your Web Browser]
               |
               v
     [Kubernetes Service]  <-- Stable IP & Port
          /          \
         v            v
     [Pod 1]        [Pod 2] <-- Ephemeral IPs (10.1.0.x)
```

No matter how many times the Pods crash, restart, or change IPs behind the scenes, the Service keeps track of them and routes incoming traffic to healthy Pods.

---

### Step 4.1: Write the `service.yaml` Manifest

Inside your `k8s-learning` folder, create a new file named `service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-web-service
spec:
  type: LoadBalancer
  selector:
    app: my-web-app
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 80
```

---

### Step 4.2: Breakdown of the Service YAML

Let's dissect every key:

1. **`apiVersion: v1`**: Services are part of the core Kubernetes API, so their version is simply `v1` (unlike Deployments which belong to `apps/v1`).
2. **`kind: Service`**: Tells Kubernetes to create a networking Service.
3. **`metadata.name: my-web-service`**: The name of this Service. It also becomes an internal DNS name inside the cluster.
4. **`spec.type: LoadBalancer`**: 
   * In a cloud provider (like AWS or GCP), `LoadBalancer` automatically provisions a real cloud load balancer.
   * In **Docker Desktop**, it has a built-in feature: it automatically exposes the service on your computer's `localhost`!
5. **`spec.selector:` -> `app: my-web-app`**: 
   * **The Glue:** This tells the Service: *"Find any Pod that has the label `app: my-web-app`, and route incoming traffic to it."* (Remember the label we stamped on our Pods in Step 3? This is how the Service connects to them).
6. **`ports:`**:
   * **`port: 8080`**: The port that the Service listens to from the outside world.
   * **`targetPort: 80`**: The port the container is actually listening on inside the Pod (our NGINX container listens on port 80).
   * In plain English: *"When traffic hits `8080`, forward it to container port `80`."*

---

### Step 4.3: Apply the Service

Apply this manifest to your cluster:

```bash
kubectl apply -f service.yaml
```

**Expected output:**
```text
service/my-web-service created
```

---

### Step 4.4: Inspect the Service and Endpoints

Check all services currently in your cluster:

```bash
kubectl get svc
```
*(Note: `svc` is the common shorthand for `service` in kubectl commands).*

**Expected output:**
```text
NAME             TYPE           CLUSTER-IP      EXTERNAL-IP   PORT(S)          AGE
kubernetes       ClusterIP      10.96.0.1       <none>        443/TCP          1h
my-web-service   LoadBalancer   10.109.12.18    localhost     8080:31234/TCP   15s
```

Look at `my-web-service`:
* `EXTERNAL-IP` says **`localhost`**.
* `PORT(S)` shows **`8080:31234/TCP`**.

Now run this secret debugging command that every senior engineer uses:

```bash
kubectl get endpoints my-web-service
```

**Expected output:**
```text
NAME             ENDPOINTS                         AGE
my-web-service   10.1.0.14:80,10.1.0.15:80        30s
```

**What is an Endpoint?**
Behind the scenes, when a Service's `selector` finds Pods with matching labels, it records their internal IP addresses in an **Endpoints** list. When a request hits your Service, it picks one of these IPs and forwards the traffic.

---

### Step 4.5: Test It in Your Browser

1. Open your web browser (Chrome, Firefox, Edge, Safari).
2. Go to:
   ```text
   http://localhost:8080
   ```
   *(Or if you prefer terminal: run `curl http://localhost:8080`)*

**Result:**
You should see:
# **Welcome to nginx!**
*If you see this page, the nginx web server is successfully installed and working...*

---

### Your Turn
1. Create `service.yaml` and apply it.
2. Check `kubectl get svc` and `kubectl get endpoints my-web-service`.
3. Open `http://localhost:8080` in your browser.
4. Let me know when you see the NGINX welcome page, and we will proceed to **Step 5: Updating and Scaling your application with zero downtime (Rolling Updates)**.