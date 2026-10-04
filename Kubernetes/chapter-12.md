In Step 4, we exposed our application using `type: LoadBalancer`. While that worked locally, in production (AWS, GCP, Azure), **every single `type: LoadBalancer` creates a physical cloud load balancer that costs around $15–$30/month**.

If an organization has 50 microservices, you don't want 50 expensive load balancers on 50 different IP addresses.

You want **one single entry door** (one LoadBalancer / IP) that inspects HTTP traffic and routes it intelligently:
* `myapp.com/api` $\rightarrow$ sends to Backend Service
* `myapp.com/` $\rightarrow$ sends to Frontend Service
* `billing.myapp.com` $\rightarrow$ sends to Billing Service

This is **Step 12: Ingress & Ingress Controllers (Production-Grade Routing)**.

---

### The Ingress Architecture: Two Pieces

Beginners often get confused because Ingress requires two distinct things:

1. **The Ingress Controller:** A real reverse proxy application (like NGINX, Traefik, or HAProxy) running inside the cluster. It listens for incoming internet traffic.
2. **The Ingress Resource:** A YAML file written by you containing routing rules (e.g., *"If host is `my-app.local`, route to `my-web-service`"*).

```text
               [Internet / Browser]
                        |
                        v
            [Single Ingress Controller] (Port 80/443)
                   /          \
    (Host: app1.local)      (Host: app2.local)
                 /              \
                v                v
         [Service A]          [Service B]
              |                    |
            [Pods]               [Pods]
```

---

### Step 12.1: Install the Ingress-NGINX Controller

Docker Desktop does not come with an Ingress Controller enabled out of the box. We can install the official Kubernetes **Ingress-NGINX Controller** with a single command:

Run this in your terminal:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/cloud/deploy.yaml
```

Now, wait for the controller to download and become ready:

```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
```

*(You will see: `pod/ingress-nginx-controller-xxxx condition met`)*.

---

### Step 12.2: Convert Your Service to `ClusterIP`

In production, your background application Services are **internal only**. They should not be directly exposed to the internet.

Open `service.yaml` and change `type: LoadBalancer` to `type: ClusterIP` (and set `port: 80`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-web-service
spec:
  type: ClusterIP
  selector:
    app: my-web-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
```

Apply it:
```bash
kubectl apply -f service.yaml
```

If you try visiting `http://localhost:8080` in your browser now, it won't work anymore. The Service is now safely locked inside the cluster.

---

### Step 12.3: Create the Ingress Rule (`ingress.yaml`)

Now let's create the routing rule to expose your app via a custom domain: `my-app.local`.

In `k8s-learning`, create `ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: my-app.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-web-service
            port:
              number: 80
```

---

### Step 12.4: Dissecting `ingress.yaml`

* **`apiVersion: networking.k8s.io/v1`**: Ingress rules live under the `networking.k8s.io` API group.
* **`kind: Ingress`**: The object type.
* **`annotations:`**: Extra instructions for the NGINX controller. `rewrite-target: /` tells it to clean up the URL path before passing it to the container.
* **`ingressClassName: nginx`**: In a cluster with multiple controllers (e.g., Traefik and NGINX), this specifies that **NGINX** should handle these rules.
* **`rules:`**:
  * **`- host: my-app.local`**: The domain name this rule applies to.
  * **`http.paths:`**:
    * **`path: /`**: Routes all paths starting with `/`.
    * **`pathType: Prefix`**: Matches everything under that path.
    * **`backend.service:`**: Points directly to our internal `my-web-service` on port `80`.

Apply the Ingress rule:

```bash
kubectl apply -f ingress.yaml
```

Verify it:
```bash
kubectl get ingress
```
*(Shortcut: `kubectl get ing`)*

**Output:**
```text
NAME              CLASS   HOSTS          ADDRESS     PORTS   AGE
web-app-ingress   nginx   my-app.local   localhost   80      10s
```

---

### Step 12.5: Test Your Ingress

Since `my-app.local` is a fictional domain, public DNS servers don't know where it is. 

We have two ways to test it:

#### Option A: Quick terminal test (Using `curl --resolve`)
This tells `curl`: *"When sending a request to `my-app.local`, send it directly to `127.0.0.1:80` (localhost)":*

```bash
curl --resolve "my-app.local:80:127.0.0.1" http://my-app.local
```

**Output:**
You will immediately see your custom HTML:
```html
<h1>Hello from Kubernetes!</h1>
<p>This page was injected via a ConfigMap without rebuilding the Docker image.</p>
```

#### Option B: Real browser test (Edit your `hosts` file)
If you want to view it in Chrome/Safari/Edge:
1. Open your computer's `hosts` file as Administrator/Superuser:
   * **macOS / Linux:** `sudo nano /etc/hosts`
   * **Windows:** Open Notepad as Administrator, then open `C:\Windows\System32\drivers\etc\hosts`
2. Add this line at the bottom:
   ```text
   127.0.0.1 my-app.local
   ```
3. Save the file.
4. Open your browser and go to:
   ```text
   http://my-app.local
   ```
   You will see your website load seamlessly over standard port 80 using a domain name.

---

### Your Turn
1. Install the `ingress-nginx` controller and wait for it to be ready.
2. Convert `service.yaml` to `ClusterIP` and apply it.
3. Create `ingress.yaml` and apply it.
4. Test it via `curl --resolve` (or your browser with the `hosts` entry).

Let me know once you see the HTML response from `my-app.local`. From here, we will step into **Step 13: Role-Based Access Control (RBAC) & Service Accounts — Securing Cluster Access**.