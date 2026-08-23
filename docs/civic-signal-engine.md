# Civic Signal Engine & Institutional Priority Score (IPS) Specification

## 1. Signal Decoupling
The engine enforces explicit separation between distinct civic interactions:
* **Amplification ($A$)**: Public interest broadcast ("This issue deserves public awareness").
* **Confirmation ($I$)**: Independent witness corroboration ("I physically observe this issue").
* **Evidence ($E$)**: Field photo updates and secondary documentation.

## 2. Evidence-Weighted IPS Formula
$$\text{IPS} = \min\left(100, (S \cdot 25) + (C \cdot 20) + (I_{\text{norm}} \cdot 20) + (E_{\text{norm}} \cdot 15) + (A_{\text{norm}} \cdot 10) + 10\right) \cdot R_{\text{decay}}$$

* **Anti-Gaming Protection**: Amplifications ($A_{\text{norm}}$) are capped at a maximum 10% contribution to the total IPS score, preventing bot farms from inflating unverified rumors into high-priority alerts.
