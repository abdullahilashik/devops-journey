In Step 6, we decoupled configuration using a ConfigMap. But what if your application needs a **database password**, an **API key**, or a **TLS certificate**? 

You must never put passwords in a ConfigMap, and you must never bake credentials into a Docker image.

This is **Step 7: Managing Sensitive Data with Kubernetes Secrets**.

---

### What is a Kubernetes Secret?

A **Secret** is an object designed specifically to hold confidential data. 

Kubernetes handles Secrets differently than ConfigMaps:
* They are kept in memory (tmpfs) on the nodes whenever possible rather than written to persistent disk.
* Access can be tightly restricted using cluster permissions (RBAC).
* Kubernetes expects the values in Secrets to be **Base64 encoded** (or you can use the convenient `stringData` field, which encodes them for you automatically).

---

### Step 7.1: Create `secret.yaml`

In your `k8s-learning` folder, create a new file named `secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secret
type: Opaque
stringData:
  db-password: "SuperSecretPassword123!"
  api-key: "xyz-98765-production-token"
```

---

### Step 7.2: Dissecting `secret.yaml`

Let's break down the keys:

* **`apiVersion: v1`**: Secrets belong to the core Kubernetes API.
* **`kind: Secret`**: Tells Kubernetes to create a secret object.
* **`metadata.name: app-secret`**: The name we will use to reference this secret in our Deployment.
* **`type: Opaque`**: The default secret type in Kubernetes. It means "arbitrary, unstructured user-defined key-value data." (Other types exist, like `kubernetes.io/tls` for SSL certs).
* **`stringData:`**: A developer-friendly field. Instead of forcing you to manually convert your password to Base64 in your terminal, `stringData` lets you type plain text; Kubernetes automatically Base64-encodes it when saving it to the cluster.

Apply the Secret:

```bash
kubectl apply -f secret.yaml
```

**Verify it:**
```bash
kubectl get secrets
```
You will see `app-secret` with `DATA: 2` (indicating 2 keys are stored inside).

To see how Kubernetes stored it:
```bash
kubectl get secret app-secret -o yaml
```
Notice how `stringData` is gone, and under `data:` your password is now Base64 encoded strings like `U3VwZXJTZWNyZXRQYXNzd29yZDEyMyE=`.

---

### Step 7.3: Inject the Secret into `deployment.yaml` as an Environment Variable

In Step 6, we mounted data as a file. This time, let's learn the second way to consume data: **Environment Variables**. Most application frameworks (Node.js, Python, Java, Go) read configurations like `process.env.DB_PASSWORD` or `os.getenv("DB_PASSWORD")`.

Open `deployment.yaml` and add an `env:` section inside your container definition:

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
        volumeMounts:
        - name: html-volume
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html-volume
        configMap:
          name: web-html-config
```

---

### Step 7.4: Dissecting the `env` Block

Look at the new lines:

```yaml
env:
- name: DATABASE_PASSWORD
  valueFrom:
    secretKeyRef:
      name: app-secret
      key: db-password
```

* **`env:`**: A list of environment variables to inject into the container.
* **`- name: DATABASE_PASSWORD`**: The exact variable name your application code will look for inside the OS environment.
* **`valueFrom:`**: Tells Kubernetes: *"Don't hardcode the value here; fetch it from an external object."*
* **`secretKeyRef:`**: Specifies that the source is a Secret.
  * **`name: app-secret`**: The name of our Secret object from Step 7.1.
  * **`key: db-password`**: The specific key inside that Secret whose value should become `$DATABASE_PASSWORD`.

---

### Step 7.5: Apply and Verify

Apply your updated deployment:

```bash
kubectl apply -f deployment.yaml
```

Wait for the rollout to complete:

```bash
kubectl rollout status deployment/my-web-app
```

Now, let's verify that the environment variable actually exists inside the running container.

1. Get the name of one of your new Pods:
   ```bash
   kubectl get pods
   ```
2. Run an interactive command using `kubectl exec` to print the environment variable:
   ```bash
   kubectl exec -it <YOUR-POD-NAME> -- printenv DATABASE_PASSWORD
   ```

**Expected output:**
```text
SuperSecretPassword123!
```

---

### The Senior DevOps Reality Check: "Base64 is NOT Encryption"

Here is a critical production lesson you must know:
* **Base64 is just an encoding scheme**, like writing backwards. Anyone who runs `kubectl get secret app-secret -o yaml` can copy the string and decode it in 2 seconds (`echo "..." | base64 --decode`).
* Because of this, **never commit `secret.yaml` files containing raw passwords to GitHub or GitLab.**

**How do real companies handle this in production?**
1. **At-rest encryption:** Enterprise clusters enable encryption in the underlying database (`etcd`).
2. **External Secret Managers:** Tools like **HashiCorp Vault**, **AWS Secrets Manager**, or **Azure Key Vault** are used. An operator inside the cluster (like *External Secrets Operator*) pulls the passwords directly into the cluster at runtime, so secrets never touch Git repositories.

---

### Your Turn
1. Create `secret.yaml` and apply it.
2. Update `deployment.yaml` with the `env` block and apply it.
3. Use `kubectl exec` with `printenv DATABASE_PASSWORD` to verify your secret landed inside the container.

Run these steps, verify the output, and let me know when you're ready for **Step 8: Keeping Pods Alive and Healthy (Liveness and Readiness Probes)**.