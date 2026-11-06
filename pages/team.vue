<template>
  <div class="divide-y divide-stone-800">
    <PageSection gradient hero>
      <template #background>
        <img fetchpriority="high" src="~/assets/images/team/team2025comp.jpg" alt="A group picture of our team in 2024">
      </template>
      <template #default>
        <h1>The Team</h1>
        <h2>
          Students at Amador Valley High.
        </h2>
      </template>
    </PageSection>
    <PageSection section-id="officers" class="space-y-12 text-center [&>*]:text-left">
      <!--  -->
      <div class="inline-flex flex-col items-center space-y-12">
        <div class="prose prose-sm prose-invert space-y-4 text-center sm:prose-base prose-headings:my-0">
          <h1>
            Officer team
          </h1>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
          
         
          <TeamMember
            name="Erdem Aktas"
            title="President"
            year="27"
            officer
            email="erdemapples@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/erdem.jpg" alt="Erdem Aktas" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Avneh Singh Bhatia"
            title="Software Lead"
            year="28"
            email="avnehb@gmail.com"
            instagram="avneh24"
            github="AvnehSBhatia"
            officer
          >
            <img loading="lazy" src="~/assets/images/team/avneh-bhatia.webp" alt="Avneh Singh Bhatia" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Shaina Gupta"
            title="Electrical Lead"
            year="28"
            email="shainagupta294@gmail.com"
            officer
          >
            <img loading="lazy" src="~/assets/images/team/shaina-gupta.webp" alt="Shaina Gupta" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Gavin Wu"
            title="Mechanical Lead"
            year="28"
            email="gw1288@pleasantonusd.net"
            officer
          >
            <img loading="lazy" src="~/assets/images/team/gavin-wu.webp" alt="Gavin Wu" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Cara Li"
            title="Operations Lead"
            year="27"
            email="lcara61015@gmail.com"
            officer
          >
            <img loading="lazy" src="~/assets/images/team/cara-li.webp" alt="Cara Li" class="team-member-image">
          </TeamMember>
         <!--
          -->
        </div>
      </div>
    </PageSection>
    <PageSection section-id="software" class="space-y-12 text-center [&>*]:text-left">
      <ImageTextSection>
        <template #image>
          <img loading="lazy" src="~/assets/images/software/collaboration.webp" alt="Two of our software members coding">
        </template>
        <template #text>
          <h1>Software team</h1>
          <p>
            They write path planning and onboard detection. They also send patches to PX4.
          </p>
        </template>
      </ImageTextSection>
      <div class="inline-flex flex-col items-center space-y-12">
        <div class="flex w-full items-center space-x-4 text-stone-400">
          <h1 class="text-lg font-medium uppercase tracking-wide sm:text-xl">
            Members
          </h1>
          <hr class="grow border-stone-800">
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
          
         
          <TeamMember
            name="Rutvi Mudalagi"
            title="Simulation"
            year="27"
            email="rutvim2009@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/rutvi.webp" alt="Rutvi Mudalagi" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Anoushka Lalwani"
            title="Vision"
            year="27"
            email="anoushkalalwani@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/anoushka-lalwani.webp" alt="Anoushka Lalwani" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Sri Nalla"
            title="Offboard/Debugging"
            year="28"
            email="srinalla2504@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/sri-nalla.webp" alt="Sri Nalla" class="team-member-image"> 
          </TeamMember>
          <TeamMember
            name="Elijah Bantugan"
            title="Offboard/Website"
            year="28"
            instagram="elijah.btg"
            github="a-riceeater"
            website="https://elijahbphotography.com"
            email="eb6592e@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/elijah-bantugan.webp" alt="Elijah Bantugan" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Matthew Yang"
            title="Simulation"
            year="28"
            email="myanghpms2021@gmail.com"
            github="DatDerpyDude81"
          >
            <img loading="lazy" src="~/assets/images/team/mathew-yang.webp" alt="Matthew Yang" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Mukund Rao"
            title="Ground Control"
            year="29"
            email="mukund.raghava@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/mukund-rao.jpeg" alt="Mukund Rao" class="team-member-image">
          </TeamMember>
        </div>
      </div>
    </PageSection>
    <PageSection section-id="electromech" class="flex flex-col items-center space-y-12">
      <ImageTextSection rtl>
        <template #image>
          <img loading="lazy" src="~/assets/images/general/Holding_drone.webp" alt="Our Electromechanical Team Holding Our Drone">
        </template>
        <template #text>
          <h1>Electromechanical team</h1>
          <p>
            They design the airframe then cut carbon and print fittings and wire it.
          </p>
        </template>
      </ImageTextSection>
      <div class="inline-flex flex-col items-center space-y-12">
        <div class="flex w-full items-center space-x-4 text-stone-400">
          <h1 class="text-lg font-medium uppercase tracking-wide sm:text-xl">
            Members
          </h1>
          <hr class="grow border-stone-800">
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
          <TeamMember
            name="Namrata Kumar"
            title="Motor"
            year="29"
            email="namrataskumar18@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/namrata-kumar.webp" alt="Namrata Kumar" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Sanisa Ghodke"
            title="Mechanical"
            year="27"
            email="sg7242@pleasantonusd.net"
          >
            <img loading="lazy" src="~/assets/images/team/sanisa-ghodke.webp" alt="Sanisa Ghodke" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Aditi Shajil"
            title="Wings"
            year="28"
            email="aditishajil@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/aditi-shajil.webp" alt="Aditi Shajil" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Tobias Hoxworth"
            title="Fuselage"
            year="27"
            email="aditishajil@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/tobias-h.png" alt="Tobias Hoxworth" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Nikhil Gummadidala"
            title="Powerload Distribution"
            year="27"
            email="nikhilsgml19@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/nikhil-gummadidala.png" alt="Nikhil Gummadidala" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Frank Li"
            title="Power Distribution"
            year="27"
            email="frankli6708@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/frank-li.webp" alt="Frank Li" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Lyvia Peng"
            title="Avionics"
            year="28"
            email="lp6336@pleasantonusd.net"
            spotify="https://open.spotify.com/user/jc6ci7z2g018gwebl1bpd38zs?si=95fdf0c2193945d6"
          >
            <img loading="lazy" src="~/assets/images/team/lyvia-peng.webp" alt="Jason Hu" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Jaden Chan"
            title="Batteries"
            year="29"
            email="14goji@gmail.com"
            instagram="https://www.instagram.com/atrag0n/"
          >
            <img loading="lazy" src="~/assets/images/team/jaden-chan.webp" alt="Jaden Chan" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Samarth Mahapatra"
            title="Motors"
            year="29"
            email="samarth1228@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/samartha-mahapatra.webp" alt="Samarth Mahapatra" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Kimi (Zihan) Tian"
            title="Tail"
            year="27"
            email="kimitian08@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/kimi-tian.webp" alt="Kimi Tian" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Amber Mo"
            title="Wings"
            year="27"
            email="ambermo3516@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/amber-mo.webp" alt="Amber Mo" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Arnan Bajaj"
            title="Tail"
            year="28"
            email="arnanbajaj@gmail.com"
            instagram="arnan.bajaj"
          >
            <img loading="lazy" src="~/assets/images/team/arnan-bajaj.webp" alt="Arnan Bajaj" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Edward Chen"
            title="Motors"
            year="27"
            email="ec8381@gmail.com"
            spotify="https://open.spotify.com/user/31yopti2dmcq2zbw6et3l65soyri?si=4c4d87f87e5c4566"
          >
            <img loading="lazy" src="~/assets/images/team/edward-chen.webp" alt="Edward Chen" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Jonathan Liu"
            title="Tails"
            year="28"
            spotify="https://open.spotify.com/user/3mvd8g2kkj80zx8n5ofzaxs7f"
            email=""
          >
            <img loading="lazy" src="~/assets/images/team/jonathan-liu.webp" alt="Jonathan Liu" class="team-member-image">
          </TeamMember>
          
          <TeamMember
            name="Debbie Mathews"
            title="Fuselage"
            year="28"
            email="mathdebbie@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/debbie-mathews.webp" alt="Debbie Mathews" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Arnav Duriseti"
            title="Landing Gear"
            year="27"
            email="avduriseti@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/arnav-duriseti.webp" alt="Arnav Duriseti" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Matthew Lee"
            title="Wings"
            year="27"
            email="14goji@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/matthew-lee.webp" alt="Matthew Lee" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Tom Simon"
            title="Landing Gear"
            year="29"
            email="tsimon@amadoruavs.com"
            spotify="https://open.spotify.com/user/m1lfvnqms1nmrolz30mgsllth?si=16f8268ae6a54588"
          >
            <img loading="lazy" src="~/assets/images/team/tom-simon.webp" alt="Tom Simon" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Brian Wen"
            title="Powerload Distribution"
            year="28"
            email="bingyuanwen@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/brian-wen.jpg" alt="Brian Wen" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Aiden Hwang"
            title="Wings"
            year="28"
            email="aiden.hwang67@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/aiden-hwang.jpeg" alt="Aiden Hwang" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Allen Li"
            title="Payload"
            year="28"
            email="al2097@pleasantonusd.net"
          >
            <img loading="lazy" src="~/assets/images/team/allen-li.jpeg" alt="Allen Li" class="team-member-image">
          </TeamMember>
        </div>
      </div>
    </PageSection>
    <PageSection section-id="business" class="flex flex-col items-center space-y-12">
      <ImageTextSection>
        <template #image>
          <img loading="lazy" src="~/assets/images/business/sponsor.webp" alt="Our team posing with a banner from one of our sponsors, SKB Cases">
        </template>
        <template #text>
          <h1>Operations team</h1>
          <p>
            They handle sponsors and grants and publicity.
          </p>
        </template>
      </ImageTextSection>
      <div class="inline-flex flex-col items-center space-y-12">
        <div class="flex w-full items-center space-x-4 text-stone-400">
          <h1 class="text-lg font-medium uppercase tracking-wide sm:text-xl">
            Members
          </h1>
          <hr class="grow border-stone-800">
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
        
        
          <TeamMember
            name="Maya Tout"
            title="Graphic Design"
            year="27"
            email="mayatout2@gmail.com"
            instagram="https://www.instagram.com/mayat9371/"
          >
            <img loading="lazy" src="~/assets/images/team/maya-tout.webp" alt="Maya Tout" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Kiaan Tikkisetty"
            title="Web Development"
            year="28"
            email="kiaanpt@gmail.com"
            instagram="kiaan.tikkisetty"
          >
            <img loading="lazy" src="~/assets/images/team/kiaan.webp" alt="Kiaan Tikkisetty" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Devi Saranya Kotla"
            title="Graphic Design"
            year="27"
            email="devi.kotla@gmail.com"
            instagram="devikotla_13"
          >
            <img loading="lazy" src="~/assets/images/team/devi-kotla.webp" alt="Devi Saranya Kotla" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Sahana Sriram"
            title="Graphic Design"
            year="27"
            email="sahana@58family.net"
            spotify="https://open.spotify.com/user/31pzf3chwyiira2frze7df6uj6ui?si=45eb8880b0c748ef"
          >
            <img loading="lazy" src="~/assets/images/team/sahana-sriram.webp" alt="Sahana Sriram" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Aarav Akella"
            title="Sponsorships/Grants"
            year="28"
            email="Aarav.akella@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/aarav-akella.webp" alt="Aarav Akella" class="team-member-image">
          </TeamMember>
          
          <TeamMember
            name="Lavanya Kadam"
            title="Graphic Design"
            year="27"
            email="lavanyaukadam@gmail.com"
            instagram="k_lavanyau"
            >
              <img loading="lazy" src="~/assets/images/team/Lavanya-Kadam.webp" alt="Lanvya Mehta" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Aakarsh Talati"
            title="Sponsorships/Grants"
            year="28"
            email="atalati@amadoruavs.com"
          >
            <img loading="lazy" src="~/assets/images/team/aakarsh-talati.jpg" alt="Aakarsh Talati" class="team-member-image">
          </TeamMember>
          <TeamMember
            name="Dharshan Sharma"
            title="Sponsorships/Grants"
            year="28"
            email="dharshansharma16@gmail.com"
            >
              <img loading="lazy" src="~/assets/images/team/dharshan-sharma.webp" alt="Dharshan Sharma" class="team-member-image">
          </TeamMember>
        </div>
      </div>
    </PageSection>
    <PageSection gradient class="py-8 text-center">
      <div class="prose prose-sm prose-invert mx-auto space-y-8 pb-12 sm:prose-base prose-headings:!my-0 prose-h1:!mb-4 prose-h2:font-normal sm:prose-h1:!mb-6">
        <h1>Alumni</h1>
      </div>
      <div class="inline-flex flex-col items-center text-left">
        <div class="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
          <PastTeamMember
            to="https://www.purdue.edu/"
            university="Purdue University"
            name="Rachel Schmidt"
            title="President"
            year="26"
            email="Rachelschmidt9582@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/rachel-schmidt.webp" alt="Rachel Schmidt">
          </PastTeamMember>
          <PastTeamMember
            to="https://illinois.edu/"
            university="UIUC"
            name="Jerry Peng"
            title="Mechanical Lead"
            year="26"
            email="jp4117@pleasantonusd.net"
          >
            <img loading="lazy" src="~/assets/images/team/jerry-peng.webp" alt="Jerry Peng">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.ucla.edu/"
            university="UCLA"
            name="Pratham Mehta"
            title="Software Lead"
            year="26"
            email="prathampmehta@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/pratham-mehta.webp" alt="Pratham Mehta">
          </PastTeamMember>
          <PastTeamMember
            to="https://sv.cmu.edu/"
            university="CMU"
            name="Syaon Kumar"
            title="Operations Lead"
            year="26"
            email="syaonkumar@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/syaon-kumar.webp" alt="Syaon Kumar">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.berkeley.edu/"
            university="UC Berkeley"
            name="Aarush Tahiliani"
            title="Software"
            year="26"
            email="aarushtahiliani8@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/aarush-tahil.webp" alt="Aarush Tahiliani">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.ucsb.edu/"
            university="UC Santa Barbara"
            name="Ibrahim Kiziloglu"
            title="Electrical Lead"
            year="26"
            email="ibrahimkiziloglu2018@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/ibrahim-kiziloglu.webp" alt="Ibrahim Kiziloglu">
          </PastTeamMember>
          <PastTeamMember
            name="Shriyan Kundu"
            title="Mechanical"
            year="26"
            spotify="https://open.spotify.com/user/lm3017y75uqscufjk27rjjygy?si=2c5ef435e6bf4eaa"
            email=""
            university="Purdue"
            to="https://www.purdue.edu/"
          >
            <img loading="lazy" src="~/assets/images/team/shriyan-kundu.webp" alt="Shriyan Kundu">
          </PastTeamMember>
          <PastTeamMember
            name="Kaique Ferreira Espinola"
            title="Mechanical"
            year="26"
            email="kaique.espinola@gmail.com"
            university="SJSU"
            to="https://www.sjsu.edu/"
          >
            <img loading="lazy" src="~/assets/images/team/kaique-espinola.webp" alt="Kaique Ferreira Espinola">
          </PastTeamMember>
          <PastTeamMember
            to="https://oregonstate.edu/"
            university="Oregon State"
            name="Nicholas Accornero"
            title="Mechanical"
            year="26"
            email="Nicholassacorn@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/nicholas-accornero.webp" alt="Nicholas Accornero">
          </PastTeamMember>
          <PastTeamMember
            name="Aadi Dahake"
            title="Mechanical"
            year="26"
            email="dahakeaadi@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/aadi-dahake.webp" alt="Aadi Dahake">
          </PastTeamMember>
          <PastTeamMember
            name="Alexander Vovenko"
            title="Electrical"
            year="26"
            email="alexvov27@gmail.com"
            university="US Navy"
            to="https://www.navy.com/"
          >
            <img loading="lazy" src="~/assets/images/team/alexander-vovenko.jpg" alt="Alexander Vovenko">
          </PastTeamMember>
          <PastTeamMember
            name="Anya Jain"
            title="Operations Lead"
            year="26"
            email="anyajain110@gmail.com"
            instagram="anyajain0"
            to="https://www.ucla.edu"
            university="UCLA"
          >
            <img loading="lazy" src="~/assets/images/team/anya-jain.webp" alt="Anya Jain">
          </PastTeamMember>
          <PastTeamMember
            name="Alice Su"
            title="Software Lead"
            year="26"
            email="sunnytingyun@gmail.com"
            github="alice-8"
            university="UCI"
            to="https://uci.edu/"
          >
            <img loading="lazy" src="~/assets/images/team/alice-su.webp" alt="Alice Su">
          </PastTeamMember>
          <PastTeamMember
            name="Athrv Gupta"
            title="Operations"
            year="26"
            email="athrv.gupta5@gmail.com"
            instagram="athrv.gupta5"
            university="KSB"
            to="https://kelley.iu.edu/index.html"
          >
            <img loading="lazy" src="~/assets/images/team/athrv-gupta.webp" alt="Athrv Gupta">
          </PastTeamMember>
          <PastTeamMember
            name="Pratyay Apparaju"
            title="Operations"
            year="26"
            email="pratyayapparaju@gmail.com"
            university="Virginia Tech"
            to="https://www.vt.edu/index.html"
          >
            <img loading="lazy" src="~/assets/images/team/pratyay-apparaju.webp" alt="Pratyay Apparaju">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.cpp.edu/"
            university="CalPoly Pomona"
            name="Angel Flores"
            title="Electrical"
            year="25"
            email="angelflowers0719@gmail.com"
          >
             <img loading="lazy" src="~/assets/images/team/angel-flores.webp" alt="Angel Flores">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.mines.edu/"
            university="CSM"
            name="Madison Leabman"
            title="Mechanical"
            year="25"
            email="ml9831@pleasantonusd.net"
          >
             <img loading="lazy" src="~/assets/images/team/maddie.webp" alt="Madison Leabman">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.rose-hulman.edu/"
            university="Rose Hulman"
            name="Christopher Hazell"
            title="Mechanical Lead"
            year="25"
            email="officers@amadoruavs.com"
          >
            <img loading="lazy" src="~/assets/images/team/christopher-hazell.webp" alt="Christopher Hazell">
          </PastTeamMember>
          <PastTeamMember
            to="https://kelley.iu.edu/index.html"
            university="IU Kelly"
            name="Nikash Ramakrishnan"
            title="Operations"
            year="25"
            email="nikashr05@gmail.com@58family.net"
          >
            <img loading="lazy" src="~/assets/images/team/nikash-ramakrishnan.webp.webp" alt="Nikash Ramakrishnan">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.washington.edu/"
            university="UofWa"
            name="Mohit Ramesh Kumar"
            title="Electrical"
            year="25"
            email="mohit10rk@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/mohit-kumar.webp" alt="Mohit Ramesh Kumar">
          </PastTeamMember>
          <PastTeamMember
            to="https://case.edu/"
            university="CWRU"
            name="Brady Lucas"
            title="Mechanical"
            year="25"
            email="brady.y.lucas@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/brady-lucas.webp" alt="Brady Lucas">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.stanford.edu/"
            university="Stanford"
            name="Angela Zhang"
            title="Mechanical"
            year="25"
            email="angela.anyuan.zhang@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/angela-zhang.webp" alt="Angela Zhang">
          </PastTeamMember>
          <PastTeamMember
            to="https://umich.edu/"
            university="UMich"
            name="Daniel Choi"
            title="Mechanical"
            year="25"
            email="choigundori@gmail.com"
          >
             <img loading="lazy" src="~/assets/images/team/daniel-choi.webp" alt="Aayush Gupta">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.ucla.edu"
            university="UCLA"
            name="Vardaan Singhania"
            title="Software"
            year="25"
            email="vardaan.singhania@gmail.com"
          >
             <img loading="lazy" src="~/assets/images/team/vardaan-singhania.webp" alt="Vardaan Singhania">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.usc.edu/"
            university="USC"
            name="Shree Khangaonkar"
            title="Operations"
            year="25"
            email="reachshreek@gmail.com"
          >
             <img loading="lazy" src="~/assets/images/team/shree-khangaonkar.webp" alt="Shree Khangaonkar">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.ucla.edu"
            university="UCLA"
            name="Aayush Gupta"
            title="President"
            year="24"
            email="sparkykenobi10101@gmail.com"
          >
             <img loading="lazy" src="~/assets/images/team/aayush-gupta.webp" alt="Aayush Gupta">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.utoronto.ca/"
            university="University of Toronto"
            name="Tanmayee Chalamalasetti"
            title="Electrical"
            year="24"
            email="tanmayeeram@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/tanmayee-chalamalasetti.webp" alt="Tanmayee Chalamalasetti">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.ucla.edu/"
            university="UCLA"
            name="Nikhil Sunkad"
            title="Software Lead"
            year="27"
            email="nikhil.sunkad@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/nikhil-sunkad.webp" alt="Nikhil Sunkad">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.ucmerced.edu/"
            university="UC Merced"
            name="Olivia Cheng"
            title="Operations"
            year="24"
            email="oc6910@pleasantonusd.net"
          >
            <img loading="lazy" src="~/assets/images/team/olivia-cheng.webp" alt="Olivia Cheng">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.duke.edu/"
            university="Duke University"
            name="Karan Gupta"
            title="Ground Control Software"
            year="24"
            email="tokarangupta@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/karan-gupta.webp" alt="Karan Gupta">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.cmu.edu/"
            university="CMU"
            name="Sahil Mehta"
            title="Obstacle Avoidance"
            year="24"
            email="mr.sahil.mehta@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/sahil-mehta.webp" alt="Sahil Mehta">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.purdue.edu/"
            university="Purdue University"
            name="Henry Tsay"
            title="Computer Vision"
            year="24"
            email="ht4411@pleasantonusd.net"
          >
            <img loading="lazy" src="~/assets/images/team/henry-tsay.webp" alt="Henry Tsay">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.laspositascollege.edu/"
            university="Las Positas College"
            name="Brandon Yao"
            title="Object Detection"
            year="24"
            email="ahoynodnarb@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/brandon-yao.webp" alt="Brandon Yao">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.ucdavis.edu"
            university="UC Davis"
            name="Clara Yin"
            title="Operations"
            year="24"
            email="clarayin129@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/clara-yin.webp" alt="Clara Yin">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.unc.edu"
            university="UNC"
            name="Darsh Shah"
            title="Operations"
            year="24"
            email="darsh06shah@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/darsh-shah.webp" alt="Darsh Shah">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.berkeley.edu"
            university="UC Berkeley"
            name="Angad Bhargav"
            title="Software"
            year="24"
            email="angad.bhargav@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/angad-bhargav.webp" alt="Angad Bhargav">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.harvard.edu"
            university="Harvard"
            name="Adam Tout"
            title="Operations"
            year="22"
            email="adam.tout123@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/adam-tout.webp" alt="Adam Tout">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.colorado.edu"
            university="CU Boulder"
            name="Shantelle Tupaz"
            title="Operations"
            year="24"
            email="st6222@pleasantonusd.net"
          >
            <img loading="lazy" src="~/assets/images/team/shantelle-tupaz.webp" alt="Shantelle Tupaz">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.laspositascollege.edu/"
            university="Las Positas College"
            name="Michael Phillips"
            title="Mechanical"
            year="23"
            email="michaeldaunicorn@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/michael-phillips.webp" alt="Michael Phillips">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.calpoly.edu/"
            university="Cal Poly SLO"
            name="Akshay Javvaji"
            title="Mechanical"
            year="23"
            email="akshayjavvaji14@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/akshay-javvaji.webp" alt="Akshay Javvaji">
          </PastTeamMember>
          <PastTeamMember
            to="https://purdue.edu/"
            university="Purdue"
            name="Luke Scheuffele"
            title="Electrical"
            year="23"
            email="ls1114@proton.me"
          >
            <img loading="lazy" src="~/assets/images/team/luke-scheuffele.webp" alt="Luke Scheuffele">
          </PastTeamMember>
          <PastTeamMember
            to="https://purdue.edu/"
            university="Purdue"
            name="Lucas Zhong"
            title="Software"
            year="23"
            email="zhonglucas@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/lucas-zhong.webp" alt="Lucas Zhong">
          </PastTeamMember>
          <PastTeamMember
            to="https://umd.edu/"
            university="UMD"
            name="Raghav Misra"
            title="Software"
            year="23"
            email="raghav.m2014@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/raghav-misra.webp" alt="Raghav Misra">
          </PastTeamMember>
          <PastTeamMember
            to="https://uci.edu/"
            university="UC Irvine"
            name="Aditi Pattanshetti"
            title="Electrical Lead"
            year="23"
            officer
            email="aditimahant@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/aditi-pattanshetti.webp" alt="Aditi Pattanshetti">
          </PastTeamMember>
          <PastTeamMember
            to="https://purdue.edu/"
            university="Purdue"
            name="Kush Nayak"
            title="Software Lead"
            year="23"
            officer
            email="kushnayak123@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/kush-nayak.webp" alt="Kush Nayak">
          </PastTeamMember>
          <PastTeamMember
            to="https://ucla.edu/"
            university="UCLA"
            name="Dylan Kwong"
            title="President"
            year="23"
            officer
            email="alamedadylankwong863@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/dylan-kwong.webp" alt="Dylan Kwong">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.berkeley.edu/"
            university="UC Berkeley"
            name="Justin Zhao"
            title="Mechanical"
            year="22"
            email="jzlego12@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/justin-zhao.webp" alt="Justin Zhao">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.washington.edu/about/seattle-campus/"
            university="UW Seattle"
            name="Kathryn Xiong"
            title="Software"
            year="22"
            email="kx1657@pleasantonusd.net"
          >
            <img loading="lazy" src="~/assets/images/team/kathryn-xiong.webp" alt="Kathryn Xiong">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.utexas.edu"
            university="UT Austin"
            name="Siddharth Bhargav"
            title="Mechanical"
            year="22"
            email="sid.bhargav@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/siddharth-bhargav.webp" alt="Siddharth Bhargav">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.sjsu.edu/"
            university="SJSU"
            name="Marie Lee"
            title="Operations"
            year="22"
            founder
            email="itsmariesemail@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/marie-lee.webp" alt="Marie Lee">
          </PastTeamMember>
          <PastTeamMember
            to="https://ucsb.edu/"
            university="UCSB"
            name="Frank Yu"
            title="Electrical"
            year="22"
            founder
            email="frank.yu.pers@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/frank-yu.webp" alt="Frank Yu">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.ucsc.edu/"
            university="UC Santa Cruz"
            name="Derick Mathews"
            title="Operations Lead"
            year="22"
            officer
            founder
            email="DerickDennisMathews@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/derick-mathews.webp" alt="Derick Mathews">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.gatech.edu/"
            university="Georgia Tech"
            name="Justin Park"
            title="Mechanical Lead"
            year="22"
            officer
            founder
            email="justinpark0902@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/justin-park.webp" alt="Justin Park">
          </PastTeamMember>
          <PastTeamMember
            to="https://ucsd.edu/"
            university="UC San Diego"
            name="Ishan Duriseti"
            title="Mechanical Lead"
            year="22"
            officer
            founder
            email="iduriseti@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/ishan-duriseti.webp" alt="Ishan Duriseti">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.calpoly.edu/"
            university="Cal Poly SLO"
            name="Kai Gottshalk"
            title="Electrical Lead"
            year="22"
            officer
            founder
            email="amkkproductions@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/kai-gottshalk.webp" alt="Kai Gottshalk">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.purdue.edu/"
            university="Purdue University"
            name="Vincent Wang"
            title="Software Lead"
            year="22"
            officer
            founder
            email="vwangsf@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/vincent-wang.webp" alt="Vincent Wang">
          </PastTeamMember>
          <PastTeamMember
            to="https://www.wisc.edu/"
            university="UW Madison"
            name="Kalyan Sriram"
            title="President"
            year="22"
            officer
            founder
            email="coder.kalyan@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/kalyan-sriram.webp" alt="Kalyan Sriram">
          </PastTeamMember>
          <PastTeamMember
            to="https://erau.edu/"
            university="ERAU"
            name="Sungje Park"
            title="President"
            year="21"
            officer
            founder
            email="sungje.park123@gmail.com"
          >
            <img loading="lazy" src="~/assets/images/team/sungje-park.webp" alt="Sungje Park">
          </PastTeamMember>
        </div>
      </div>
    </PageSection>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: "Team",
});
</script>

<style scoped>
  .team-member-image {
    transition: transform 0.3s ease-in-out, filter 0.3s ease-in-out;
    z-index: -1;
  }

  .team-member-image:hover {
    transform: scale(1.1);
    filter: brightness(1.2);
  }

  .team-member-links {
    position: relative;
    z-index: 200;
  }
</style>

