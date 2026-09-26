<template>
  <div class="brand-mark" aria-hidden="true">
    <span class="brand-mark__bubble brand-mark__bubble--large"></span>
    <span class="brand-mark__bubble brand-mark__bubble--small"></span>
  </div>
</template>

<style scoped>
.brand-mark {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: linear-gradient(145deg, #5d63e6, #7768e9);
  box-shadow: 0 10px 28px rgb(93 99 230 / 28%);
}

.brand-mark__bubble {
  position: absolute;
  display: block;
  border: 2px solid white;
  border-radius: 7px;
}

.brand-mark__bubble::after {
  position: absolute;
  bottom: -4px;
  left: 5px;
  width: 5px;
  height: 5px;
  content: '';
  background: #6a64e7;
  border-right: 2px solid white;
  border-bottom: 2px solid white;
  transform: rotate(45deg);
}

.brand-mark__bubble--large {
  top: 10px;
  left: 8px;
  width: 19px;
  height: 14px;
}

.brand-mark__bubble--small {
  right: 7px;
  bottom: 8px;
  width: 13px;
  height: 10px;
  opacity: 0.8;
}
</style>
