// Scroll opens the original laptop, then carries the visitor into its screen.
export class AnimationManager {
  constructor(sceneManager, laptopModel) {
    this.laptopModel = laptopModel;
    const gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    const root = laptopModel.getRootGroup();
    const hinge = laptopModel.getHingeGroup();
    if (!root || !hinge) return;
    const initialScale = root.scale.clone();
    const initialZ = root.position.z;
    const copy = document.querySelector('.intro-copy');
    const chapter = document.querySelector('.intro-chapter');
    const hint = document.querySelector('.intro-hint');
    const number = document.querySelector('.intro-number');
    this.timeline = gsap.timeline({
      scrollTrigger: {
        trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: ({ progress }) => {
          laptopModel.updateBootScreenProgress(Math.max(0, (progress - .45) / .55));
          copy.style.opacity = Math.max(0, 1 - progress * 4);
          copy.style.transform = `translateY(${-progress * 30}px)`;
          number.textContent = `${Math.round(progress * 100).toString().padStart(2, '0')}%`;
          chapter.innerHTML = progress < .5 ? '01 <i></i> The desk' : '02 <i></i> Make yourself at home';
          hint.innerHTML = progress < .5 ? 'Scroll to open the laptop <span>↓</span>' : 'A little closer… <span>↓</span>';
        },
      },
    });
    this.timeline
      .to(hinge.rotation, { x: .1, duration: .5, ease: 'none' }, 0)
      .to(root.rotation, { x: -.9, y: 0, z: 0, duration: .5, ease: 'none' }, 0)
      .to(root.position, { z: initialZ + 1.5, duration: .5, ease: 'none' }, 0)
      .to(root.position, { z: initialZ + 8, y: 0, duration: .5, ease: 'power1.out' }, .5)
      .to(root.scale, {
        x: initialScale.x * 3, y: initialScale.y * 3, z: initialScale.z * 3,
        duration: .5, ease: 'power1.out',
      }, .5)
      .to(root.rotation, { x: -1.32, duration: .5, ease: 'power1.out' }, .5);
  }

  destroy() {
    this.timeline?.scrollTrigger?.kill();
    this.timeline?.kill();
  }
}
