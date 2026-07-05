import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, fonts } from '../../../constants/theme';
import { colores, espaciado, radios } from '../../../theme/tokens';
import MascotaGuiaJuego from './MascotaGuiaJuego';
import { resolveAchievementIcon } from './achievementIcon';

const CONFETTI_PIECES = Object.freeze([
  { id: 'aqua-1', left: '8%', top: 18, color: colors.yellow, rotate: '18deg' },
  { id: 'sol-1', left: '19%', top: 54, color: colores.alerta, rotate: '-12deg' },
  { id: 'verde-1', left: '34%', top: 24, color: colores.exito, rotate: '31deg' },
  { id: 'rosa-1', left: '56%', top: 16, color: colores.error, rotate: '-28deg' },
  { id: 'aqua-2', left: '72%', top: 52, color: colors.purple, rotate: '9deg' },
  { id: 'sol-2', left: '88%', top: 28, color: colores.alerta, rotate: '-18deg' },
  { id: 'verde-2', left: '13%', top: 132, color: colores.exito, rotate: '-38deg' },
  { id: 'rosa-2', left: '29%', top: 152, color: colores.error, rotate: '42deg' },
  { id: 'aqua-3', left: '47%', top: 118, color: colors.yellow, rotate: '-8deg' },
  { id: 'sol-3', left: '64%', top: 142, color: colores.alerta, rotate: '35deg' },
  { id: 'verde-3', left: '82%', top: 118, color: colores.exito, rotate: '-44deg' },
]);

function ConfettiCelebration() {
  const animationsRef = useRef(CONFETTI_PIECES.map(() => new Animated.Value(0)));

  useEffect(() => {
    const animations = animationsRef.current.map((animation, index) => (
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 90),
          Animated.timing(animation, {
            toValue: 1,
            duration: 1450,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      )
    ));

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, []);

  return (
    <View pointerEvents="none" style={styles.confettiLayer}>
      {CONFETTI_PIECES.map((piece, index) => {
        const animation = animationsRef.current[index];
        const translateY = animation.interpolate({
          inputRange: [0, 1],
          outputRange: [-32, 150],
        });
        const opacity = animation.interpolate({
          inputRange: [0, 0.16, 0.84, 1],
          outputRange: [0, 0.95, 0.95, 0],
        });
        const rotate = animation.interpolate({
          inputRange: [0, 1],
          outputRange: [piece.rotate, '220deg'],
        });

        return (
          <Animated.View
            key={piece.id}
            style={[
              styles.confettiPiece,
              {
                backgroundColor: piece.color,
                left: piece.left,
                top: piece.top,
                opacity,
                transform: [{ translateY }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function MetricCard({ item, accentIndex = 0 }) {
  const label = item?.label ?? item?.etiqueta ?? 'Metrica';
  const value = item?.value ?? item?.valor ?? '--';
  const compact = Boolean(item?.compact);
  const isPurpleCard = accentIndex === 0;
  const isYellowCard = accentIndex === 1;
  const isGreenCard = accentIndex === 2;

  return (
    <View
      style={[
        styles.metricCard,
        isPurpleCard && styles.metricCardPurple,
        isYellowCard && styles.metricCardYellow,
        isGreenCard && styles.metricCardGreen,
        compact && styles.metricCardLandscape,
      ]}
    >
      <Text
        style={[
          styles.metricLabel,
          isPurpleCard && styles.metricLabelOnDark,
          isGreenCard && styles.metricLabelOnDark,
          compact && styles.metricLabelLandscape,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.metricValue,
          isPurpleCard && styles.metricValueOnDark,
          isGreenCard && styles.metricValueOnDark,
          compact && styles.metricValueLandscape,
        ]}
      >
        {String(value)}
      </Text>
    </View>
  );
}

function AchievementCard({ achievement }) {
  return (
    <View style={styles.achievementCard}>
      <View style={styles.achievementIconBubble}>
        <Text style={styles.achievementIconText}>{resolveAchievementIcon(achievement)}</Text>
      </View>

      <View style={styles.achievementTextContent}>
        <Text style={styles.achievementTitle}>
          {achievement.nombre_logro ?? achievement.nombre ?? 'Logro'}
        </Text>
        {achievement.descripcion ? (
          <Text style={styles.achievementDescription}>{achievement.descripcion}</Text>
        ) : null}
      </View>
    </View>
  );
}

function GameResultPortraitAssetTemplate({
  templateAsset,
  ribbonText,
  title,
  stars,
  metrics,
  progressTitle,
  progressMessage,
  syncing,
  primaryLabel,
  onPrimary,
  primaryDisabled,
}) {
  const metricRows = metrics.slice(0, 6);
  const metricPositions = [
    { top: '44.2%', left: '10.8%' },
    { top: '44.2%', left: '54.8%' },
    { top: '54.3%', left: '10.8%' },
    { top: '54.3%', left: '54.8%' },
    { top: '64.4%', left: '10.8%' },
    { top: '64.4%', left: '54.8%' },
  ];

  return (
    <View style={styles.assetResultScreen}>
      <ImageBackground
        source={templateAsset}
        resizeMode="contain"
        style={styles.assetResultCanvas}
        imageStyle={styles.assetResultCanvasImage}
      >
        <View style={styles.assetRibbonCover}>
          <Text style={styles.assetRibbonText} numberOfLines={1}>
            {ribbonText}
          </Text>
        </View>

        <View style={styles.assetStarsRow}>
          {stars.map((active, index) => (
            <Text
              key={`asset-star-${index}`}
              style={[
                styles.assetStarText,
                !active && styles.assetStarTextInactive,
              ]}
            >
              {active ? '★' : '☆'}
            </Text>
          ))}
        </View>

        {metricRows.map((item, index) => {
          const slot = metricPositions[index];
          const value = String(item?.value ?? item?.valor ?? '--');

          return (
            <View
              key={`asset-metric-${item?.label ?? item?.etiqueta ?? index}`}
              style={[
                styles.assetMetricCard,
                {
                  top: slot.top,
                  left: slot.left,
                },
              ]}
            >
              <Text style={styles.assetMetricLabel} numberOfLines={1}>
                {item?.label ?? item?.etiqueta ?? 'Dato'}
              </Text>
              <Text style={styles.assetMetricValue} numberOfLines={1}>
                {value}
              </Text>
            </View>
          );
        })}

        <View style={styles.assetMessageCover}>
          <Text style={styles.assetMessageTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.assetMessageText}>
            {syncing ? 'Guardando tu resultado...' : progressMessage}
          </Text>
        </View>

        <TouchableOpacity
          disabled={primaryDisabled}
          onPress={onPrimary}
          style={[
            styles.assetPrimaryButtonCover,
            primaryDisabled && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.assetPrimaryButtonText} numberOfLines={1}>
            {primaryLabel}
          </Text>
        </TouchableOpacity>
      </ImageBackground>
    </View>
  );
}

export function GameMissionGuideOverlay({
  title,
  message,
  steps,
  actionLabel,
  onStart,
  studentName,
  variant,
}) {
  const fullMessage = studentName
    ? `Hola, ${studentName}. ${message}`
    : message;

  return (
    <View style={styles.missionOverlay}>
      <MascotaGuiaJuego
        variante={variant}
        titulo={title}
        mensaje={fullMessage}
        pasos={steps}
        accion={actionLabel}
        onAccion={onStart}
      />
    </View>
  );
}

export function GameResultOverlay({
  ribbonText,
  badgeText,
  title,
  rewardTitle = 'Premio del reto',
  description,
  starsEarned = 0,
  metrics = [],
  progressTitle = 'Progreso guardado',
  progressMessage,
  achievements = [],
  continueLabel,
  onContinue,
  exitLabel,
  onExit,
  topExitLabel,
  onTopExit,
  topExitDisabled = false,
  celebrating = false,
  syncing = false,
  viewport,
  portraitTemplateAsset,
}) {
  const isLandscape = (viewport?.width ?? 0) > (viewport?.height ?? Number.MAX_SAFE_INTEGER);
  const isCompact = isLandscape || (viewport?.height ?? 999) <= 430 || (viewport?.width ?? 999) <= 780;
  const stars = useMemo(
    () => Array.from({ length: 3 }, (_, index) => index < starsEarned),
    [starsEarned],
  );
  const primaryLabel = continueLabel ?? exitLabel ?? 'Continuar';
  const primaryAction = onContinue ?? onExit ?? null;
  const usePortraitAssetTemplate = Boolean(portraitTemplateAsset) && !isLandscape;

  if (usePortraitAssetTemplate && primaryAction) {
    return (
      <GameResultPortraitAssetTemplate
        templateAsset={portraitTemplateAsset}
        ribbonText={ribbonText}
        title={title}
        stars={stars}
        metrics={metrics}
        progressTitle={progressTitle}
        progressMessage={progressMessage}
        syncing={syncing}
        primaryLabel={primaryLabel}
        onPrimary={primaryAction}
        primaryDisabled={syncing}
      />
    );
  }

  return (
    <View style={styles.resultOverlay}>
      {celebrating ? <ConfettiCelebration /> : null}

      <View pointerEvents="none" style={styles.resultDecoration}>
        <View style={[styles.resultBubble, styles.resultBubbleAqua]} />
        <View style={[styles.resultBubble, styles.resultBubbleSun]} />
        <View style={[styles.resultBubble, styles.resultBubblePink]} />
        <Text style={[styles.resultIcon, styles.resultIconOne]}>★</Text>
        <Text style={[styles.resultIcon, styles.resultIconTwo]}>✦</Text>
        <Text style={[styles.resultIcon, styles.resultIconThree]}>●</Text>
      </View>

      {onTopExit ? (
        <View style={styles.resultHeaderBar}>
          <TouchableOpacity
            disabled={topExitDisabled}
            onPress={onTopExit}
            style={[styles.topExitButton, topExitDisabled && styles.topExitButtonDisabled]}
          >
            <Text style={styles.topExitButtonText}>{topExitLabel ?? 'Volver'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.resultContentContainer,
          isCompact && styles.resultContentContainerCompact,
          isLandscape && styles.resultContentContainerLandscape,
        ]}
      >
        <View
          style={[
            styles.resultPanel,
            isCompact && styles.resultPanelCompact,
            isLandscape && styles.resultPanelLandscape,
          ]}
        >
          <View style={styles.resultRibbon}>
            <Text style={[styles.resultRibbonText, isCompact && styles.resultRibbonTextCompact]}>
              {ribbonText}
            </Text>
          </View>

          <View style={[styles.resultBody, isLandscape && styles.resultBodyLandscape]}>
            <View style={[styles.resultHeroWrap, isLandscape && styles.resultHeroWrapLandscape]}>
              <View
                style={[
                  styles.resultHero,
                  isCompact && styles.resultHeroCompact,
                  isLandscape && styles.resultHeroLandscape,
                ]}
              >
                <View style={styles.resultAura} />

                <View style={styles.resultBadge}>
                  <Text style={[styles.resultBadgeText, isCompact && styles.resultBadgeTextCompact]}>
                    {badgeText}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.resultTitle,
                    isCompact && styles.resultTitleCompact,
                    isLandscape && styles.resultTitleLandscape,
                  ]}
                >
                  {title}
                </Text>

                <View
                  style={[
                    styles.resultStarsRow,
                    isCompact && styles.resultStarsRowCompact,
                    isLandscape && styles.resultStarsRowLandscape,
                  ]}
                >
                  {stars.map((active, index) => (
                    <View
                      key={`result-star-${index}`}
                      style={[
                        styles.resultStarBubble,
                        !active && styles.resultStarBubbleInactive,
                        isCompact && styles.resultStarBubbleCompact,
                        isLandscape && styles.resultStarBubbleLandscape,
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultStarText,
                          !active && styles.resultStarTextInactive,
                          isCompact && styles.resultStarTextCompact,
                          isLandscape && styles.resultStarTextLandscape,
                        ]}
                      >
                        {active ? '★' : '☆'}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={[
                    styles.resultRewardCard,
                    isCompact && styles.resultRewardCardCompact,
                    isLandscape && styles.resultRewardCardLandscape,
                  ]}
                >
                  <Text style={styles.resultRewardLabel}>{rewardTitle}</Text>
                  <Text
                    style={[
                      styles.resultDescription,
                      isCompact && styles.resultDescriptionCompact,
                      isLandscape && styles.resultDescriptionLandscape,
                    ]}
                  >
                    {description}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.resultAside, isLandscape && styles.resultAsideLandscape]}>
              {metrics.length ? (
                <View
                  style={[
                    styles.metricsGrid,
                    isCompact && styles.metricsGridCompact,
                    isLandscape && styles.metricsGridLandscape,
                  ]}
                >
                  {metrics.map((item, index) => {
                    const metricKey = `${item?.label ?? item?.etiqueta ?? 'metric'}-${String(item?.value ?? item?.valor ?? index)}-${index}`;

                    return (
                      <MetricCard
                        key={metricKey}
                        item={isLandscape ? { ...item, compact: true } : item}
                        accentIndex={index % 3}
                      />
                    );
                  })}
                </View>
              ) : null}

              {progressMessage ? (
                <View
                  style={[
                    styles.progressPanel,
                    isCompact && styles.progressPanelCompact,
                    isLandscape && styles.progressPanelLandscape,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressTitle,
                      isCompact && styles.progressTitleCompact,
                      isLandscape && styles.progressTitleLandscape,
                    ]}
                  >
                    {progressTitle}
                  </Text>
                  <Text
                    style={[
                      styles.progressMessage,
                      isCompact && styles.progressMessageCompact,
                      isLandscape && styles.progressMessageLandscape,
                    ]}
                  >
                    {syncing ? 'Guardando tu resultado...' : progressMessage}
                  </Text>
                </View>
              ) : null}

              {achievements.length ? (
                <View style={[styles.achievementsList, isCompact && styles.achievementsListCompact]}>
                  <Text style={[styles.progressTitle, isCompact && styles.progressTitleCompact]}>
                    Logros nuevos
                  </Text>
                  {achievements.map((achievement, index) => (
                    <AchievementCard
                      key={`${achievement.id ?? achievement.nombre_logro ?? achievement.nombre ?? 'logro'}-${index}`}
                      achievement={achievement}
                    />
                  ))}
                </View>
              ) : null}

              <View
                style={[
                  styles.resultButtons,
                  isCompact && styles.resultButtonsCompact,
                  isLandscape && styles.resultButtonsLandscape,
                ]}
              >
                {onContinue ? (
                  <TouchableOpacity
                    disabled={syncing}
                    onPress={onContinue}
                    style={[
                      styles.primaryButton,
                      isCompact && styles.primaryButtonCompact,
                      isLandscape && styles.primaryButtonLandscape,
                      syncing && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={[styles.primaryButtonText, isCompact && styles.buttonTextCompact]}>
                      {continueLabel ?? 'Continuar'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {onExit ? (
                  <TouchableOpacity
                    disabled={syncing}
                    onPress={onExit}
                    style={[
                      styles.secondaryButton,
                      isCompact && styles.secondaryButtonCompact,
                      isLandscape && styles.secondaryButtonLandscape,
                      syncing && styles.buttonDisabled,
                    ]}
                  >
                    <Text style={[styles.secondaryButtonText, isCompact && styles.buttonTextCompact]}>
                      {exitLabel ?? 'Volver'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  missionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.md,
    backgroundColor: 'rgba(8, 19, 38, 0.58)',
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    backgroundColor: '#10113A',
  },
  resultDecoration: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  resultBubble: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.42,
  },
  resultBubbleAqua: {
    width: 260,
    height: 260,
    top: -90,
    left: -100,
    backgroundColor: colors.purple,
  },
  resultBubbleSun: {
    width: 220,
    height: 220,
    right: -86,
    top: 72,
    backgroundColor: '#FFD54F',
  },
  resultBubblePink: {
    width: 260,
    height: 260,
    bottom: -120,
    left: 38,
    backgroundColor: '#FF5B9F',
  },
  resultIcon: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.13)',
    fontWeight: '900',
  },
  resultIconOne: {
    top: 116,
    left: 48,
    fontSize: 42,
    transform: [{ rotate: '-14deg' }],
  },
  resultIconTwo: {
    top: 286,
    right: 42,
    fontSize: 34,
    transform: [{ rotate: '20deg' }],
  },
  resultIconThree: {
    bottom: 112,
    left: 28,
    fontSize: 28,
  },
  resultHeaderBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
    paddingTop: espaciado.md,
    paddingHorizontal: espaciado.md,
  },
  topExitButton: {
    alignSelf: 'flex-start',
    borderRadius: radios.pill,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    backgroundColor: '#FFF2C7',
    borderWidth: 2,
    borderColor: '#F2C858',
  },
  topExitButtonDisabled: {
    opacity: 0.55,
  },
  topExitButtonText: {
    color: '#5A2F17',
    fontFamily: fonts.black,
    fontSize: 14,
  },
  resultContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 92,
    paddingBottom: espaciado.xl,
    paddingHorizontal: espaciado.md,
  },
  resultContentContainerCompact: {
    paddingTop: 58,
    paddingBottom: espaciado.md,
    paddingHorizontal: espaciado.sm,
  },
  resultContentContainerLandscape: {
    paddingTop: 30,
    paddingBottom: espaciado.xs,
    paddingHorizontal: espaciado.md,
  },
  resultPanel: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#FFF4D8',
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#8E541E',
    paddingTop: 38,
    paddingHorizontal: espaciado.md,
    paddingBottom: espaciado.md,
    shadowColor: '#000000',
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  resultPanelCompact: {
    maxWidth: 390,
    borderRadius: 28,
    paddingTop: 32,
    paddingHorizontal: espaciado.sm,
    paddingBottom: espaciado.sm,
  },
  resultPanelLandscape: {
    width: '88%',
    maxWidth: 680,
    borderRadius: 22,
    paddingTop: 16,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  resultBody: {
    gap: espaciado.sm,
  },
  resultBodyLandscape: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  resultHeroWrap: {
    width: '100%',
  },
  resultHeroWrapLandscape: {
    flex: 1.02,
  },
  resultHeroLandscape: {
    paddingVertical: 9,
    paddingHorizontal: 9,
    borderRadius: 18,
    gap: 5,
  },
  resultRibbon: {
    position: 'absolute',
    top: -24,
    alignSelf: 'center',
    minWidth: 214,
    paddingVertical: 11,
    paddingHorizontal: espaciado.lg,
    borderRadius: radios.pill,
    backgroundColor: colors.purple,
    borderWidth: 3,
    borderColor: colors.yellow,
    shadowColor: colors.purpleDark,
    shadowOpacity: 0.38,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 10,
  },
  resultRibbonText: {
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  resultRibbonTextCompact: {
    fontSize: 16,
  },
  resultHero: {
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 28,
    backgroundColor: '#FFFDF7',
    borderWidth: 3,
    borderColor: colors.yellow,
    gap: 10,
  },
  resultHeroCompact: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 22,
    gap: 8,
  },
  resultAura: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -142,
    backgroundColor: '#FFF1A8',
  },
  resultBadge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radios.pill,
    backgroundColor: colors.purpleDark,
    borderWidth: 2,
    borderColor: colors.purple,
  },
  resultBadgeText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  resultBadgeTextCompact: {
    fontSize: 10,
  },
  resultTitle: {
    color: '#3B220F',
    fontFamily: fonts.black,
    fontSize: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(255,213,79,0.36)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  resultTitleCompact: {
    fontSize: 24,
  },
  resultTitleLandscape: {
    fontSize: 18,
    lineHeight: 22,
  },
  resultStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 2,
  },
  resultStarsRowCompact: {
    gap: 6,
  },
  resultStarsRowLandscape: {
    gap: 4,
  },
  resultStarBubble: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4B8',
    borderWidth: 3,
    borderColor: '#FF9F1C',
    shadowColor: '#C57A00',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  resultStarBubbleCompact: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  resultStarBubbleLandscape: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  resultStarBubbleInactive: {
    backgroundColor: '#EEF2F7',
    borderColor: '#D4DCE8',
  },
  resultStarText: {
    color: '#FFB703',
    fontFamily: fonts.black,
    fontSize: 48,
    textShadowColor: 'rgba(196, 126, 0, 0.34)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  resultStarTextCompact: {
    fontSize: 40,
  },
  resultStarTextLandscape: {
    fontSize: 28,
  },
  resultStarTextInactive: {
    color: '#A8B3C3',
    textShadowColor: 'transparent',
  },
  resultRewardCard: {
    width: '100%',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFF1BA',
    borderWidth: 2,
    borderColor: colors.yellow,
    gap: 4,
  },
  resultRewardCardCompact: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  resultRewardCardLandscape: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  resultAside: {
    width: '100%',
  },
  resultAsideLandscape: {
    flex: 0.78,
    justifyContent: 'space-between',
  },
  resultRewardLabel: {
    color: colors.purple,
    fontFamily: fonts.black,
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  resultDescription: {
    color: '#5A2F17',
    fontFamily: fonts.bold,
    lineHeight: 20,
    textAlign: 'center',
  },
  resultDescriptionCompact: {
    lineHeight: 18,
    fontSize: 14,
  },
  resultDescriptionLandscape: {
    fontSize: 12,
    lineHeight: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
    marginTop: espaciado.sm,
  },
  metricsGridCompact: {
    gap: espaciado.xs,
  },
  metricsGridLandscape: {
    marginTop: 0,
    gap: espaciado.xs,
  },
  metricCard: {
    minWidth: '30%',
    flexGrow: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 22,
    borderWidth: 2,
    gap: 4,
    alignItems: 'center',
  },
  metricCardLandscape: {
    minWidth: '31%',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  metricCardPurple: {
    backgroundColor: colors.purple,
    borderColor: colors.purpleDark,
  },
  metricCardYellow: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellowDark,
  },
  metricCardGreen: {
    backgroundColor: colores.exito,
    borderColor: '#0E8F59',
  },
  metricLabel: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 18,
  },
  metricLabelOnDark: {
    color: colors.white,
  },
  metricValueOnDark: {
    color: colors.white,
  },
  metricLabelLandscape: {
    fontSize: 9,
  },
  metricValueLandscape: {
    fontSize: 14,
  },
  progressPanel: {
    marginTop: espaciado.sm,
    padding: espaciado.sm,
    borderRadius: 22,
    backgroundColor: '#E2C6FA',
    borderWidth: 2,
    borderColor: colors.purple,
    gap: espaciado.xs,
  },
  progressPanelCompact: {
    borderRadius: 18,
    padding: espaciado.xs,
  },
  progressPanelLandscape: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: espaciado.xs,
  },
  progressTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    textAlign: 'center',
  },
  progressTitleCompact: {
    fontSize: 14,
  },
  progressTitleLandscape: {
    fontSize: 12,
  },
  progressMessage: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    lineHeight: 19,
    textAlign: 'center',
  },
  progressMessageCompact: {
    fontSize: 14,
    lineHeight: 17,
  },
  progressMessageLandscape: {
    fontSize: 11,
    lineHeight: 14,
  },
  achievementsList: {
    marginTop: espaciado.sm,
    gap: espaciado.xs,
  },
  achievementsListCompact: {
    gap: 6,
  },
  achievementCard: {
    padding: espaciado.sm,
    borderRadius: 24,
    backgroundColor: '#E2C6FA',
    borderWidth: 2,
    borderColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  achievementIconBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.yellow,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  achievementIconText: {
    fontSize: 27,
  },
  achievementTextContent: {
    flex: 1,
    gap: 3,
  },
  achievementTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
  },
  achievementDescription: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    lineHeight: 17,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: espaciado.sm,
    marginTop: espaciado.md,
  },
  resultButtonsCompact: {
    gap: espaciado.xs,
    marginTop: espaciado.sm,
  },
  resultButtonsLandscape: {
    marginTop: 6,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 26,
    paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderWidth: 4,
    borderColor: colors.yellow,
    shadowColor: colors.purpleDark,
    shadowOpacity: 0.42,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaryButtonCompact: {
    borderRadius: 22,
    paddingVertical: 14,
  },
  primaryButtonLandscape: {
    minHeight: 42,
    borderWidth: 3,
    borderRadius: 18,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.black,
    fontSize: 16,
    textShadowColor: colors.purpleDark,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 26,
    paddingVertical: 17,
    alignItems: 'center',
    backgroundColor: colors.yellow,
    borderWidth: 4,
    borderColor: colors.yellowDark,
    shadowColor: colors.yellowDark,
    shadowOpacity: 0.36,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  secondaryButtonCompact: {
    borderRadius: 22,
    paddingVertical: 14,
  },
  secondaryButtonLandscape: {
    minHeight: 42,
    borderWidth: 3,
    borderRadius: 18,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 16,
  },
  buttonTextCompact: {
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  assetResultScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10113A',
    paddingHorizontal: espaciado.xs,
    paddingVertical: espaciado.sm,
  },
  assetResultCanvas: {
    width: '96%',
    height: '92%',
    maxWidth: 520,
    aspectRatio: 888 / 1556,
    alignSelf: 'center',
  },
  assetResultCanvasImage: {
    resizeMode: 'contain',
  },
  assetRibbonCover: {
    position: 'absolute',
    top: '20.8%',
    left: '12%',
    width: '76%',
    minHeight: '8%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  assetRibbonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 18,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  assetStarsRow: {
    position: 'absolute',
    top: '40.8%',
    left: '31.5%',
    width: '37%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetStarText: {
    color: colors.yellowDark,
    fontFamily: fonts.black,
    fontSize: 36,
  },
  assetStarTextInactive: {
    color: '#A8B3C3',
  },
  assetMetricCard: {
    position: 'absolute',
    width: '34.4%',
    minHeight: '7.8%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  assetMetricLabel: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  assetMetricValue: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 22,
    textAlign: 'center',
  },
  assetMessageCover: {
    position: 'absolute',
    top: '73.6%',
    left: '10%',
    width: '80%',
    minHeight: '12.2%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  assetMessageTitle: {
    color: colors.purpleDark,
    fontFamily: fonts.black,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 4,
  },
  assetMessageText: {
    color: colors.purpleDark,
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
  assetPrimaryButtonCover: {
    position: 'absolute',
    left: '10%',
    bottom: '5.3%',
    width: '80%',
    minHeight: '7.8%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  assetPrimaryButtonText: {
    color: colors.white,
    fontFamily: fonts.black,
    fontSize: 22,
    textAlign: 'center',
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  confettiPiece: {
    position: 'absolute',
    width: 12,
    height: 20,
    borderRadius: 5,
    opacity: 0.88,
  },
});
