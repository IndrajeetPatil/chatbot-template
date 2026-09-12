# Local chatbot demo

[Documentation](README.md) · [Project overview and video](../README.md#see-it-in-action)

## Recording notes

| Recording detail | Value                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| App              | Local Vite + FastAPI at `http://localhost:3000/chat`                               |
| Model            | Live Azure OpenAI GPT-6 Astra, low reasoning                                       |
| Shows            | Submission, streaming, equations, highlighted Python, scrolling, dark/light themes |
| Editing          | Waiting time shortened; no audio                                                   |
| Text alternative | Response transcript below                                                          |

- The response came from the model, not a mocked API or scripted reply.
- To repeat it, run `make setup`, configure Azure, then `make service`.
- Select GPT-6 Astra / Low reasoning and send the prompt below; responses may vary.

## Prompt

> How can I model projectile motion in Python? Show the horizontal and vertical
> position equations in LaTeX, then a short typed Python function. Use 20 m/s at
> 45 degrees and evaluate at 1 second. Ignore air resistance and keep the
> explanation concise.

## Response transcript

Ignoring air resistance and starting at the origin, projectile position is:

$$
x(t) = v_0 \cos(\theta)\,t
$$

$$
y(t) = v_0 \sin(\theta)\,t - \frac{1}{2}gt^2
$$

Here, $v_0$ is initial speed, $\theta$ is launch angle, and
$g = 9.81\ \mathrm{m/s^2}$.

```python
import math


def position(t: float, speed: float, angle_deg: float) -> tuple[float, float]:
    theta = math.radians(angle_deg)
    x = speed * math.cos(theta) * t
    y = speed * math.sin(theta) * t - 0.5 * 9.81 * t**2
    return x, y


x, y = position(1.0, 20.0, 45.0)
print(f"x = {x:.2f} m, y = {y:.2f} m")
```

At $t = 1$ second: **$x = 14.14\ \mathrm{m}$, $y = 9.24\ \mathrm{m}$**.
