-- Seed dummy packages for marketing screenshots
-- Coach ID: 029aa60d-945a-4fda-82df-54c7b1a0c207
-- NOTE: Delete these before production! Run: DELETE FROM coach_packages WHERE coach_id = '029aa60d-945a-4fda-82df-54c7b1a0c207';

INSERT INTO public.coach_packages (
  coach_id, name, description, amount_cents, currency, interval, interval_count,
  is_active, is_visible, sort_order, features, free_trial_days, image_url
) VALUES
-- 1. Premium Monthly Coaching
(
  '029aa60d-945a-4fda-82df-54c7b1a0c207',
  'Premium Coaching',
  'Complete 1-on-1 coaching with personalized workout plans, nutrition guidance, and weekly check-ins. Perfect for dedicated athletes.',
  14900, 'usd', 'month', 1,
  true, true, 1,
  '["Personalized workout plans", "Weekly video check-ins", "Nutrition guidance", "24/7 chat support", "Progress tracking"]'::jsonb,
  7,
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
),
-- 2. Basic Monthly
(
  '029aa60d-945a-4fda-82df-54c7b1a0c207',
  'Basic Training',
  'Get started with structured training programs and monthly progress reviews. Great for beginners.',
  4900, 'usd', 'month', 1,
  true, true, 2,
  '["Monthly workout program", "Exercise video library", "Monthly check-in", "Email support"]'::jsonb,
  14,
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80'
),
-- 3. Elite Weekly
(
  '029aa60d-945a-4fda-82df-54c7b1a0c207',
  'Elite Performance',
  'Intensive weekly coaching for competitive athletes. Includes daily programming and performance analytics.',
  7900, 'usd', 'week', 1,
  true, true, 3,
  '["Daily custom programming", "Performance analytics", "2x weekly video calls", "Competition prep", "Recovery protocols", "Priority support"]'::jsonb,
  0,
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80'
),
-- 4. Annual Membership
(
  '029aa60d-945a-4fda-82df-54c7b1a0c207',
  'Annual Membership',
  'Best value! Full year of premium coaching at a discounted rate. Commit to your transformation.',
  119900, 'usd', 'year', 1,
  true, true, 4,
  '["Everything in Premium", "2 months FREE", "Quarterly goal setting", "Priority scheduling", "Exclusive workshops"]'::jsonb,
  0,
  'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=800&q=80'
),
-- 5. One-Time Assessment
(
  '029aa60d-945a-4fda-82df-54c7b1a0c207',
  'Fitness Assessment',
  'Comprehensive fitness evaluation with personalized recommendations. Perfect starting point for your journey.',
  9900, 'usd', 'one_time', NULL,
  true, true, 5,
  '["Full body composition analysis", "Movement assessment", "Strength testing", "Personalized report", "30-day starter plan"]'::jsonb,
  0,
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80'
),
-- 6. Group Training Monthly
(
  '029aa60d-945a-4fda-82df-54c7b1a0c207',
  'Group Training',
  'Join our community training program. Live group sessions and shared accountability.',
  2900, 'usd', 'month', 1,
  true, true, 6,
  '["3x weekly group sessions", "Community chat access", "Monthly challenges", "Workout library"]'::jsonb,
  7,
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
),
-- 7. Nutrition Only
(
  '029aa60d-945a-4fda-82df-54c7b1a0c207',
  'Nutrition Coaching',
  'Dedicated nutrition coaching with meal plans, macro tracking, and bi-weekly consultations.',
  7900, 'usd', 'month', 1,
  true, true, 7,
  '["Custom meal plans", "Macro calculations", "Bi-weekly consultations", "Recipe database", "Grocery lists"]'::jsonb,
  0,
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80'
),
-- 8. 12-Week Transformation
(
  '029aa60d-945a-4fda-82df-54c7b1a0c207',
  '12-Week Transformation',
  'Intensive 12-week program designed for maximum results. Complete body and lifestyle transformation.',
  49900, 'usd', 'month', 3,
  true, true, 8,
  '["Complete program structure", "Weekly coaching calls", "Nutrition plan included", "Progress photos & tracking", "Private community access", "Lifetime workout access"]'::jsonb,
  0,
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80'
),
-- 9. Daily Check-in
(
  '029aa60d-945a-4fda-82df-54c7b1a0c207',
  'Daily Accountability',
  'Daily check-ins and accountability coaching. Stay on track with personalized daily feedback.',
  1900, 'usd', 'day', 1,
  true, true, 9,
  '["Daily progress review", "Instant feedback", "Habit tracking", "Morning motivation"]'::jsonb,
  3,
  'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80'
);
