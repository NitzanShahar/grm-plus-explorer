# Writes the category probabilities computed by the reference R simulator
# (generate_irt in GRM+_sigma_acq.R from the paper's companion repo) for a
# grid of item and person parameters, as JSON lines on stdout.
# Usage: Rscript tests/reference_probs.R path/to/GRM+_sigma_acq.R
args <- commandArgs(trailingOnly = TRUE)
source(args[1])
# Capture the probability vector instead of sampling from it.
sample.int <- function(n, size, prob) prob
set.seed(1)
for (K in 2:7) for (rev in c(FALSE, TRUE)) for (r in 1:40) {
  a <- exp(rnorm(1, 0.3, 0.6))
  b <- sort(rnorm(K - 1, 0, 1.2))
  sp <- list(psi = rnorm(1, 0, 1.5), sigma = exp(rnorm(1, 0, 0.8)), zeta = rnorm(1, 0, 1.5))
  p <- generate_irt(a, b, rev, sp, K)
  cat(sprintf('{"a":%.17g,"b":[%s],"rev":%s,"psi":%.17g,"sigma":%.17g,"zeta":%.17g,"p":[%s]}\n',
    a, paste(sprintf("%.17g", b), collapse = ","), tolower(rev), sp$psi, sp$sigma, sp$zeta,
    paste(sprintf("%.17g", p), collapse = ",")))
}
