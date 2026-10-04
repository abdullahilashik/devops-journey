Seeing that welcome page means your network plumbing is working: your local machine talked to the Kubernetes Service, which routed traffic to one of your Pods, which served the response.

Now that we have a running, exposed app, we tackle what production engineering is really about: **Managing changes without downtime.**

Welcome to **Step 5: Scaling, Zero-Downtime Rolling Updates, and Rollbacks**.

---

### Step 5.1: Declarative Scaling (Handling Traffic Spikes)

Imagine Black Friday is approaching and traffic is about to quadruple. You need 4 copies of your app instead of 2.

1. Open your `deployment.yaml` file.
2. Change `replicas: 2` to:
   ```yaml
   replicas: 4
   ```
3. Save the file.
4. Apply the change:
   ```bash
   kubectl apply -f deployment.yaml
   ```

**Now check your Pods:**
```bash
kubectl get pods
```
You will immediately see 4 Pods running.

**Now check your Service Endpoints:**
```bash
kubectl get endpoints my-web-service
```
You will see **all 4 Pod IP addresses** listed. The Service automatically detected the new Pods and added them to the load-balancing pool. No manual IP routing required.

---

### Step 5.2: Zero-Downtime Rolling Updates

In traditional server management, updating an app often meant: stop the server, update the file, restart the server (resulting in 30 seconds of downtime).

Kubernetes uses a **Rolling Update** strategy by default:
1. It spins up **one new Pod** with the new version.
2. It waits for the new Pod to become healthy and ready.
3. It routes incoming traffic to the new Pod.
4. It shuts down **one old Pod**.
5. It repeats this process until all Pods are running the new version. **Zero downtime for users.**

Let's test this.

1. Open `deployment.yaml`.
2. Look at the `containers:` section. Change the image from `nginx:alpine` to an explicit version tag, like `nginx:1.25.5-alpine`:
   ```yaml
         containers:
         - name: nginx-container
           image: nginx:1.25.5-alpine
           ports:
           - containerPort: 80
   ```
3. Save the file.

Now, open your terminal. We will apply the change and immediately monitor the rollout in real-time:

```bash
kubectl apply -f deployment.yaml
kubectl rollout status deployment/my-web-app
```

**Expected output:**
```text
Waiting for deployment "my-web-app" rollout to finish: 1 out of 4 new replicas have been updated...
Waiting for deployment "my-web-app" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "my-web-app" rollout to finish: 3 out of 4 new replicas have been updated...
deployment "my-web-app" successfully rolled out
```

If you refreshed `http://localhost:8080` in your browser during this entire process, you wouldn't have received a single error.

---

### Step 5.3: Simulating a Bad Deployment (The "Broken Build")

Every engineer makes a mistake eventually. Let's see how Kubernetes protects you when someone pushes broken configuration.

1. Open `deployment.yaml`.
2. Change the image to a non-existent tag that will fail:
   ```yaml
         containers:
         - name: nginx-container
           image: nginx:this-tag-does-not-exist
           ports:
           - containerPort: 80
   ```
3. Apply it:
   ```bash
   kubectl apply -f deployment.yaml
   ```
4. Now check your Pods:
   ```bash
   kubectl get pods
   ```

**What you will see:**
```text
NAME                          READY   STATUS         RESTARTS   AGE
my-web-app-79888d946d-2d4s1   1/1     Running        0          3m
my-web-app-79888d946d-9jkl2   1/1     Running        0          3m
my-web-app-79888d946d-pl98m   1/1     Running        0          3m
my-web-app-79888d946d-w76tr   1/1     Running        0          3m
my-web-app-6c589b4f9f-broken  0/1     ErrImagePull   0          10s
```

**Notice something crucial:**
The cluster tried to spin up the new broken Pod (`ErrImagePull` / `ImagePullBackOff`). 
Because the new Pod **never became healthy**, Kubernetes **refused to kill any of your old healthy running Pods**. 

Go refresh `http://localhost:8080` in your browser right now. **The app is still alive and working!** 

---

### Step 5.4: The Emergency Rollback (`undo`)

The deployment failed, and alerts are firing. You don't have time to open YAML files and find previous versions—you need to undo the change immediately.

Run this command:

```bash
kubectl rollout undo deployment/my-web-app
```

**Output:**
```text
deployment.apps/my-web-app rolled back
```

Now run:
```bash
kubectl get pods
```
The broken Pod is immediately terminated and removed, returning the cluster to its last known good state.

You can also check the history of your releases anytime:
```bash
kubectl rollout history deployment/my-web-app
```

---

### Your Turn
1. Scale your deployment to **4 replicas** and check `kubectl get endpoints my-web-service`.
2. Update the image to `nginx:1.25.5-alpine` and run `kubectl rollout status`.
3. Test a broken deployment with `nginx:this-tag-does-not-exist`.
4. Perform the `kubectl rollout undo` to fix it.

Try these out and let me know when you've seen the rollback in action. After this, we will move to **Step 6: Configuring applications without rebuilding images (ConfigMaps and Environment Variables)**.