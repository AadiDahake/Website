<template>
  <div class="divide-y divide-stone-800">
    <PageSection hero>
      <template #background>
        <img src="~/assets/images/general/team2025.webp" alt="The 2025 AmadorUAVs team">
      </template>
      <h1>Sponsor <span class="grad-text">Us</span></h1>
      <h2>
        Sponsors pay for our parts and our trip to SUAS.
      </h2>
    </PageSection>

    <!-- the ask: unmissable, right after the hero -->
    <PageSection>
      <div class="split">
        <TraceImage :src="team2025" alt="The 2025 AmadorUAVs team" />
        <div class="sp-ask" data-reveal>
          <p class="label eyebrow">
            Support
          </p>
          <h2 class="sp-head">
            Where the money goes
          </h2>
          <p>
            The money buys carbon fibre and MN7005 motors. It also covers the 6S4P pack filament and the trip to SUAS.
          </p>
          <div class="sp-cta">
            <NuxtLink to="mailto:officers@amadoruavs.com" class="btn btn-grad">
              officers@amadoruavs.com
            </NuxtLink>
          </div>
        </div>
      </div>
    </PageSection>

    <PageSection>
      <p class="label eyebrow">
        Partners
      </p>
      <h2 class="sp-head">
        Current sponsors
      </h2>
      <p class="sp-sub">
        They gave money or parts. Some gave services.
      </p>
      <div class="mx-auto grid max-w-4xl grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4">
        <Sponsor to="https://amadorptsa.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/ptsa.webp" alt="AVHS PTSA Logo">
        </Sponsor>
        <Sponsor to="https://mochiholic.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/mochiholic.webp" alt="Mochiholic Logo">
        </Sponsor>
        <Sponsor to="https://www.ximea.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/ximea.webp" alt="Ximea Logo">
        </Sponsor>
        <Sponsor to="https://www.alliedvision.cn/cn/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/allied-vision.webp" alt="Allied Vision Logo">
        </Sponsor>
        <Sponsor to="https://va-imaging.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/imaging.webp" alt="Imaging Logo">
        </Sponsor>
        <Sponsor to="https://airsupply.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/air-supply.webp" alt="Air-Supply Logo">
        </Sponsor>
        <Sponsor to="https://skbcases.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/skb.webp" alt="SKB Cases Logo">
        </Sponsor>
        <Sponsor to="https://zubax.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/zubax.webp" alt="Zubax Logo">
        </Sponsor>
        <Sponsor to="https://ppie.org/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/ppie.webp" alt="PPIE Logo">
        </Sponsor>
        <Sponsor to="https://www.datron.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/datron.webp" alt="Datron Logo">
        </Sponsor>
        <Sponsor to="http://www.holybro.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/holybro.webp" alt="Holybro Logo">
        </Sponsor>
        <Sponsor to="https://xoarintl.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/xoar.webp" alt="XOAR Logo">
        </Sponsor>
        <Sponsor to="https://www.kctool.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/kctool.webp" alt="KC Tool Logo">
        </Sponsor>
        <Sponsor to="https://west3d.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/west3d.webp" alt="West 3D Logo">
        </Sponsor>
        <Sponsor to="https://mandalaroseworks.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/mandala.webp" alt="Mandala Rose Works LLC Logo">
        </Sponsor>
        <Sponsor to="https://deepfriedhero.in/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/dfh.webp" alt="DFH Logo">
        </Sponsor>
        <Sponsor to="https://www.vipav.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/vip.webp" alt="VIP Audio Visual Company Logo">
        </Sponsor>
        <Sponsor to="https://store.cuav.net/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/cuav.webp" alt="CUAV Logo">
        </Sponsor>
        <Sponsor to="https://www.insta360.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/insta360.webp" alt="Insta360 Logo">
        </Sponsor>
        <Sponsor to="https://computar.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/computar.webp" alt="Computar Logo">
        </Sponsor>
        <Sponsor to="https://www.digikey.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/digi-key.webp" alt="Digi-Key Logo">
        </Sponsor>
        <Sponsor to="https://fastsigns.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/fastsigns.webp" alt="Fastsigns Logo">
        </Sponsor>
        <Sponsor to="https://jlcpcb.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/jlcpcb.webp" alt="JLCPCB Logo">
        </Sponsor>
        <Sponsor to="https://pololu.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/pololu.webp" alt="Pololu Logo">
        </Sponsor>
        <Sponsor to="https://rfdesign.com.au/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/rf-design.webp" alt="RF Design Logo">
        </Sponsor>
        <Sponsor to="https://sensirion.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/sensirion.webp" alt="Sensirion Logo">
        </Sponsor>
        <Sponsor to="https://simscale.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/simscale.webp" alt="Simscale Logo">
        </Sponsor>
        <Sponsor to="https://startech.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/startech.webp" alt="StarTech.com Logo">
        </Sponsor>
        <Sponsor to="https://weller-tools.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/weller.webp" alt="Weller Logo">
        </Sponsor>
        <Sponsor to="https://kla.foundation/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/kla.webp" alt="KLA Logo">
        </Sponsor>
        <Sponsor to="https://polymaker.com/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/polymaker.webp" alt="Polymaker Logo">
        </Sponsor>
        <Sponsor to="https://www.nvidia.com/en-us/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/nvdia.webp" alt="NVIDIA Logo">
        </Sponsor>
        <Sponsor to="https://www.tek.com/en" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/tektronix.webp" alt="Tektronix Logo">
        </Sponsor>
        <Sponsor to="https://www.mysortimo.us/en_US/" target="_blank" data-reveal>
          <img src="~/assets/images/sponsors/sortimo.webp" alt="Sortimo Logo">
        </Sponsor>
      </div>
    </PageSection>
    <PageSection>
      <p class="label eyebrow">
        Upstream
      </p>
      <h2 class="sp-head">
        Affiliates
      </h2>
      <p class="sp-sub">
        These are not sponsors. They are projects we work with.
      </p>
      <div class="mx-auto grid max-w-4xl grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4">
        <Sponsor to="https://px4.io/" target="_blank" data-reveal>
          <img src="~/assets/images/affiliates/px4.webp" alt="PX4 Logo">
        </Sponsor>
        <Sponsor to="https://uavcan.org/" target="_blank" data-reveal>
          <img src="~/assets/images/affiliates/uavcan.webp" alt="UAVCAN Logo">
        </Sponsor>
        <Sponsor to="https://mavsdk.mavlink.io/" target="_blank" data-reveal>
          <img src="~/assets/images/affiliates/mavsdk.webp" alt="MAVSDK Logo">
        </Sponsor>
        <Sponsor to="https://mavlink.io/" target="_blank" data-reveal>
          <img src="~/assets/images/affiliates/mavlink.webp" alt="MAVLINK Logo">
        </Sponsor>
        <Sponsor to="https://dronecode.org/" target="_blank" data-reveal>
          <img src="~/assets/images/affiliates/dronecode.webp" alt="Dronecode Logo">
        </Sponsor>
      </div>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
import team2025 from "~/assets/images/general/team2025.webp";
useHead({
  title: "Sponsor",
});
</script>

<style scoped>
.sp-head {
  font-size: var(--size-head);
  margin-bottom: 0.9rem;
  max-width: 20ch;
}

.sp-sub {
  max-width: 60ch;
  margin-bottom: 2rem;
}

.sp-ask p {
  max-width: 46ch;
}

.sp-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 1.4rem;
}
</style>
