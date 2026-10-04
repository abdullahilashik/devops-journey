Up to this point, our containers have been **stateless**. If an NGINX pod crashed, we didn't care if its local files were lost—we just wanted a fresh container to serve traffic.

But what if you are running a database (PostgreSQL, MySQL, MongoDB), a file upload service, or a cache? 

By default, container filesystems are **ephemeral** (temporary). When a container restarts or a Pod gets replaced, **any file written inside it is deleted forever**.

To save data permanently, we use **Step 11: Persistent Storage — PV, PVC, and StorageClass**.

---

### The Three Layers of Kubernetes Storage

Kubernetes decouples storage into three concepts so developers don't need to know how the underlying hardware works:

1. **StorageClass (SC):** The storage vendor/provider. It defines *how* disks are created automatically (e.g., AWS EBS, GCP Persistent Disk, or local disk).
2. **PersistentVolume (PV):** The actual disk. Think of it as a physical hard drive or network volume.
3. **PersistentVolumeClaim (PVC):** The "voucher" or "ticket" written by you. It says: *"I need 1 Gigabyte of storage with ReadWriteOnce access. Go find a matching disk or create one."*

```text
[StorageClass]  <-- The Disk Provisioner (Cloud/Local)
      |
      v  (automatically provisions)
[PersistentVolume (PV)]  <-- The actual 1GB Disk
      ^
      |  (binds to)
[PersistentVolumeClaim (PVC)]  <-- Your request ticket
      ^
      |  (mounted by)
    [Pod]  <-- Container writes data to /data
```

---

### Step 11.1: Check Your Default StorageClass

Docker Desktop comes with a built-in StorageClass that dynamically creates volumes on your machine.

Check it by running:

```bash
kubectl get storageclass
```
*(Shortcut: `kubectl get sc`)*

**Output:**
```text
NAME                 PROVISIONER                    RECLAIMPOLICY   VOLUMEBINDINGMODE   ...
hostpath (default)   docker.io/hostpath             Delete          Immediate           ...
```
Notice `(default)` next to `hostpath`. Because a default exists, you don't even have to specify which storage driver to use—Kubernetes handles it automatically.

---

### Step 11.2: Create a PersistentVolumeClaim (`pvc.yaml`)

Let's order a disk from the cluster.

In your `k8s-learning` folder, create a file named `pvc.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

---

### Step 11.3: Dissecting `pvc.yaml`

Let's look at the two critical fields under `spec:`:

1. **`accessModes:`**:
   * **`ReadWriteOnce` (RWO)**: The disk can be mounted as read-write by **a single Node at a time** (standard for block storage like AWS EBS or local disks).
   * *(Other modes include `ReadOnlyMany` and `ReadWriteMany`, used for shared network filesystems like NFS or AWS EFS).*
2. **`resources.requests.storage: 1Gi`**:
   * Specifies the size of disk you need (here, 1 Gibibyte).

Apply the claim:

```bash
kubectl apply -f pvc.yaml
```

**Check the status:**
```bash
kubectl get pvc
```

**Expected output:**
```text
NAME         STATUS   VOLUME                                     CAPACITY   ACCESS MODES   AGE
my-app-pvc   Bound    pvc-87893245-a7b2-4d1a-82f3-1234567890ab   1Gi        RWO            5s
```

Look at the **STATUS**: **`Bound`**. 
The cluster saw your claim, automatically created a matching PersistentVolume (PV) behind the scenes, and tied ("bound") them together.

You can even see the underlying PV that was auto-generated:
```bash
kubectl get pv
```

---

### Step 11.4: Attach the PVC to a Pod

Now let's use this storage. We will create a small deployment called `storage-demo.yaml` that mounts this persistent disk to `/app/data`.

Create `storage-demo.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storage-demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: storage-demo
  template:
    metadata:
      labels:
        app: storage-demo
    spec:
      containers:
      - name: storage-container
        image: alpine
        # Keep the container running in an idle loop so we can interact with it
        command: ["sh", "-c", "while true; do sleep 3600; done"]
        volumeMounts:
        - name: persistent-storage
          mountPath: /app/data
      volumes:
      - name: persistent-storage
        persistentVolumeClaim:
          claimName: my-app-pvc
```

Notice how `volumes:` points directly to the `claimName: my-app-pvc`.

Apply it:
```bash
kubectl apply -f storage-demo.yaml
```

Verify it is running:
```bash
kubectl get pods -l app=storage-demo
```

---

### Step 11.5: Write Data to the Disk

Let's write a file to the persistent directory inside the running container.

1. Get the pod name:
   ```bash
   kubectl get pods -l app=storage-demo
   ```
2. Use `kubectl exec` to write a text file to `/app/data/important.txt`:
   ```bash
   kubectl exec -it <STORAGE-DEMO-POD-NAME> -- sh -c "echo 'Kubernetes data persists!' > /app/data/important.txt"
   ```
3. Read the file to verify it's there:
   ```bash
   kubectl exec -it <STORAGE-DEMO-POD-NAME> -- cat /app/data/important.txt
   ```
   **Output:** `Kubernetes data persists!`

---

### Step 11.6: The Survival Experiment (Kill the Pod)

Now, let's prove the data is not tied to the container. We will brutally delete the Pod:

```bash
kubectl delete pod <STORAGE-DEMO-POD-NAME>
```

Because it belongs to a Deployment, the Deployment will immediately create a **brand-new Pod** with a completely different Pod ID.

1. Get the name of the new Pod:
   ```bash
   kubectl get pods -l app=storage-demo
   ```
2. Read the file from inside the **new Pod**:
   ```bash
   kubectl exec -it <NEW-POD-NAME> -- cat /app/data/important.txt
   ```

**The Result:**
```text
Kubernetes data persists!
```

The container died, its local memory vanished, its temporary root disk was wiped, but because `/app/data` was backed by a **PersistentVolumeClaim**, your file remained completely intact and was automatically reattached to the replacement Pod.

---

### Your Turn
1. Check your default storage class with `kubectl get sc`.
2. Create and apply `pvc.yaml`. Verify it says `Bound`.
3. Create and apply `storage-demo.yaml`.
4. Write the file into `/app/data/important.txt`.
5. Delete the pod, wait for the replacement, and verify the file is still there.

Run through this test, and let me know once your data survives the pod deletion. Then we will move to **Step 12: Ingress Controllers — Moving Beyond Port Numbers to Real Hostnames and Routing**.