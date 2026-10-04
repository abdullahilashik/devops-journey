You're moving fast, and you've already mastered the core lifecycle of Pods, Deployments, and Services.

Now we tackle an essential production rule from the **12-Factor App methodology**: **Decoupling configuration from container images**.

Welcome to **Step 6: ConfigMaps & Injecting Application Configuration**.

---

### The Problem: The "Hardcoded Image" Trap

Right now, our Pods run a stock NGINX image that serves the default *"Welcome to nginx!"* page. 

If you want to change that text or configure your web server, a novice mistake is to:
1. Edit the files on your laptop.
2. Build a new Docker image (`docker build -t my-custom-nginx .`).
3. Push it to Docker Hub.
4. Update the Deployment to pull the new image.

**Why this is bad in production:**
* You should use the **exact same container image** across development, staging, and production.
* If you only need to change a database URL, a feature flag, or a static config file, you should **never rebuild a Docker image**.
* Instead, you inject configuration from the outside using a **ConfigMap**.

---

### What is a ConfigMap?

A **ConfigMap** is a Kubernetes object that stores non-confidential key-value pairs or entire configuration files. 

You can feed a ConfigMap to your Pods in two ways:
1. **As Environment Variables** (great for simple strings like `DATABASE_PORT=5432`).
2. **As Mounted Files** (great for injecting full config files or HTML pages directly into the container's filesystem).

We are going to use **Method 2**: We will write our own custom HTML page inside a ConfigMap, mount it directly into NGINX at `/usr/share/nginx/html/index.html`, and watch our webpage change live—**without building a single Docker image.**

---

### Step 6.1: Create `configmap.yaml`

In your `k8s-learning` folder, create a new file named `configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-html-config
data:
  index.html: |
    <!DOCTYPE html>
    <html>
      <head>
        <title>Kubernetes Lab</title>
        <style>
          body { font-family: sans-serif; background-color: #0f172a; color: #38bdf8; text-align: center; padding-top: 100px; }
          h1 { font-size: 48px; }
          p { font-size: 20px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <h1>Hello from Kubernetes!</h1>
        <p>This page was injected via a ConfigMap without rebuilding the Docker image.</p>
      </body>
    </html>
```

---

### Step 6.2: Dissecting `configmap.yaml`

Let's break down the keys:
* **`apiVersion: v1`**: ConfigMaps are a core primitive, so they use `v1`.
* **`kind: ConfigMap`**: Tells Kubernetes to create a configuration store.
* **`metadata.name: web-html-config`**: The unique name of this ConfigMap. We will reference this exact name in our Deployment.
* **`data:`**: The dictionary where your configuration items live.
* **`index.html: |`**: 
  * The key is `index.html`.
  * The pipe character (`|`) in YAML means: *"Treat everything indented below this line as a multi-line string block."*

Apply this ConfigMap:

```bash
kubectl apply -f configmap.yaml
```

**Verify it:**
```bash
kubectl get configmaps
```
*(You will see `web-html-config` listed).*

---

### Step 6.3: Update `deployment.yaml` to Mount the ConfigMap

Now we need to tell our Deployment: *"Take the file inside `web-html-config` and mount it into the container at `/usr/share/nginx/html/index.html`."*

Open `deployment.yaml` and update it to look like this:

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
        volumeMounts:
        - name: html-volume
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html-volume
        configMap:
          name: web-html-config
```

---

### Step 6.4: Understanding `volumes` vs `volumeMounts`

Notice the two new sections added to the bottom:

#### 1. `volumes:` (Defined on the Pod level)
* **What it means:** Defines **where the data comes from**.
* **`- name: html-volume`**: An arbitrary label we give this volume source.
* **`configMap.name: web-html-config`**: Tells the Pod: *"Fetch the data stored in the ConfigMap named `web-html-config`."*

#### 2. `volumeMounts:` (Defined inside the container)
* **What it means:** Defines **where to attach that data** inside this specific container's filesystem.
* **`- name: html-volume`**: Links to the volume defined in step 1.
* **`mountPath: /usr/share/nginx/html`**: Overrides NGINX's default document root directory with the contents of our ConfigMap!

---

### Step 6.5: Apply and Verify

Apply your updated deployment:

```bash
kubectl apply -f deployment.yaml
```

Track the rolling update to ensure the new Pods are healthy:

```bash
kubectl rollout status deployment/my-web-app
```

Now open your browser and refresh:
```text
http://localhost:8080
```

**The Result:**
Instead of the generic NGINX welcome screen, you will now see your custom dark-mode styled HTML page:
> # **Hello from Kubernetes!**
> *This page was injected via a ConfigMap without rebuilding the Docker image.*

---

### Step 6.6: Senior Engineer Inspection: `kubectl exec`

How do you verify what the container's file system actually looks like? We use `kubectl exec` to run a command inside a live container.

1. Get one of your running Pod names:
   ```bash
   kubectl get pods
   ```
2. Run this command to inspect the mounted file inside that Pod:
   ```bash
   kubectl exec -it <YOUR-POD-NAME> -- cat /usr/share/nginx/html/index.html
   ```

You will see the exact HTML from your ConfigMap printed directly from the inside of the container!

---

### Your Turn
1. Create `configmap.yaml` and apply it.
2. Update `deployment.yaml` with the `volumes` and `volumeMounts` blocks, and apply it.
3. Refresh `http://localhost:8080` to see your custom page.
4. Try using `kubectl exec` to read the file from inside one of the Pods.

Let me know once you see your custom webpage, and we will move to **Step 7: Sensitive Data — Handling Passwords and API Keys with Kubernetes Secrets**.