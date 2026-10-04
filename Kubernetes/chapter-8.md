In production, simply checking if a container process is running is not enough. 

A container might be running, but:
1. It is frozen in a deadlock and can't process requests.
2. It is still starting up (e.g., warming caches or connecting to a database) and isn't ready for user traffic yet.

If Kubernetes blindly routes traffic to an unready container, users get `502 Bad Gateway` errors. If a container hangs indefinitely, users get timeouts.

This brings us to **Step 8: Production Health Checks — Liveness & Readiness Probes**.

---

### The Two Core Questions Kubernetes Asks Your App

Kubernetes solves this with two distinct health checks:

| Probe | Question it asks | What happens if it fails? |
| :--- | :--- | :--- |
| **`readinessProbe`** | *"Are you ready to accept user traffic right now?"* | **Removes the Pod from the Service.** No traffic is sent to it until it recovers. The Pod is **not** killed. |
| **`livenessProbe`** | *"Are you still alive and working properly?"* | **Restarts the container.** Kubernetes kills the deadlocked container and boots up a fresh one. |

---

### Step 8.1: Understanding Probe Settings

When configuring a probe, you typically define:
* **`httpGet`**: Makes an HTTP request (like a web browser). Any HTTP status code between `200` and `399` means success.
* **`initialDelaySeconds`**: How long to wait after the container starts before running the first check (gives the app time to boot up).
* **`periodSeconds`**: How often to run the check (e.g., check every 5 seconds).
* **`failureThreshold`**: How many consecutive times the check must fail before taking action (prevents restarting over temporary network blips).

---

### Step 8.2: Add Probes to `deployment.yaml`

Let's configure both probes on our NGINX deployment. 

Open `deployment.yaml` and add the `readinessProbe` and `livenessProbe` sections under your container:

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
        env:
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: app-secret
              key: db-password
        
        # --- HEALTH CHECKS START HERE ---
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
        # --- HEALTH CHECKS END HERE ---

        volumeMounts:
        - name: html-volume
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html-volume
        configMap:
          name: web-html-config
```

---

### Step 8.3: Apply the Manifest

Apply your updated deployment:

```bash
kubectl apply -f deployment.yaml
```

Now, watch the rollout:

```bash
kubectl rollout status deployment/my-web-app
```

Because of `initialDelaySeconds: 5`, you will notice a brief, deliberate pause during the rollout: Kubernetes waits 5 seconds, pings `http://<pod-ip>:80/`, gets a `200 OK` response, marks the Pod `READY`, and only *then* terminates the old Pod. 

This guarantees **true zero-downtime deployments**.

---

### Step 8.4: Inspect the Probes in Action

Run `kubectl describe` on one of your Pods:

```bash
kubectl get pods
kubectl describe pod <YOUR-POD-NAME>
```

Scroll to the **Containers** section. You will see:
```text
Liveness:    http-get http://:80/ delay=10s timeout=1s period=10s #success=1 #failure=3
Readiness:   http-get http://:80/ delay=5s timeout=1s period=5s #success=1 #failure=3
```
Your Pod is now actively self-monitoring every few seconds.

---

### Step 8.5: The Failure Experiment (See Readiness in Action)

Let's break a probe intentionally to see how Kubernetes protects your users.

1. Open `deployment.yaml`.
2. Change the `readinessProbe` path to an endpoint that does **not** exist (e.g., `/healthz-does-not-exist`):
   ```yaml
           readinessProbe:
             httpGet:
               path: /healthz-does-not-exist
               port: 80
             initialDelaySeconds: 2
             periodSeconds: 3
   ```
3. Apply the change:
   ```bash
   kubectl apply -f deployment.yaml
   ```
4. Now immediately check your Pods:
   ```bash
   kubectl get pods
   ```

**What you will see:**
```text
NAME                          READY   STATUS    RESTARTS   AGE
my-web-app-xxxxxxxxxx-xxxxx   0/1     Running   0          15s
my-web-app-xxxxxxxxxx-yyyyy   0/1     Running   0          15s
```

Look at the **READY** column: **`0/1`**. 
The container is `Running`, but it is **NOT ready**.

Now check your Service Endpoints:
```bash
kubectl get endpoints my-web-service
```
**Output:**
```text
NAME             ENDPOINTS   AGE
my-web-service   <none>      2h
```
Because the Pods failed their readiness check, Kubernetes **refused to send them any traffic**. It completely removed their IPs from the Service to protect your end-users.

5. Now check `kubectl describe pod <BROKEN-POD-NAME>`:
At the bottom in **Events**, you will see a warning:
```text
Warning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 404
```

---

### Step 8.6: Fix the Probe

Change the `path:` back to `/`:
```yaml
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
```

Apply it:
```bash
kubectl apply -f deployment.yaml
```

Run `kubectl get pods` until you see `READY: 1/1` again. Check `kubectl get endpoints my-web-service` to confirm the Pod IPs have been restored.

---

### Your Turn
1. Add the `readinessProbe` and `livenessProbe` blocks to `deployment.yaml` and apply.
2. Run the failure experiment: change the path to a non-existent URL and observe `READY 0/1` and `ENDPOINTS <none>`.
3. Fix the path back to `/` and watch it heal.

Confirm once you've observed this failure and recovery cycle. Then we will move to **Step 9: Resource Management — CPU and Memory Requests & Limits (Preventing Cluster Crashes)**.